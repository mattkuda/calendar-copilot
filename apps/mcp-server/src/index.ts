#!/usr/bin/env node
import * as dotenv from 'dotenv';
import express, { Request, Response, Router, RequestHandler } from 'express';
import { google } from 'googleapis';
import { parseISO, addMinutes, format, startOfDay, endOfDay, addDays, addHours } from 'date-fns';
import path from 'path';
import { processCalendarPrompt, generateCalendarQueryResponse, generateEventCreationResponse } from './llm';
import { CalendarIntent } from './llm'; // Import the intent type

// This is now working
dotenv.config();

// Simple API server for calendar operations
const app = express();
app.use(express.json());

// Create router for API routes
const router = Router();

// Mock tokens - in a production app, store securely
let accessToken = '';
let refreshToken = '';

// Create OAuth2 client
const createAuthClient = () => {
    // Check for client credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google API credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google'
    );

    // Set tokens (for MVP - in production these would be retrieved from secure storage)
    if (accessToken && refreshToken) {
        client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
    } else {
        throw new Error('No Google Calendar authorization. Please connect your calendar first.');
    }

    return client;
};

// Create service account auth client
const createServiceAuthClient = () => {
    const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    if (!serviceAccountPrivateKey || !serviceAccountEmail) {
        throw new Error('Missing Google service account credentials. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your .env file.');
    }

    return new google.auth.JWT({
        email: serviceAccountEmail,
        key: serviceAccountPrivateKey,
        scopes: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ]
    });
};

// Create Google OAuth client for auth
const getGoogleAuthClient = () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google API credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.');
    }

    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3100/api/auth/callback' // Callback URL for this server
    );
};

// Parse natural language dates
const parseDate = (dateStr: string): Date => {
    // Handle natural language dates
    if (dateStr.toLowerCase() === 'today') {
        return new Date();
    } else if (dateStr.toLowerCase() === 'tomorrow') {
        return addDays(new Date(), 1);
    } else if (dateStr.toLowerCase() === 'next week') {
        return addDays(new Date(), 7);
    }

    // Try to parse as ISO date
    try {
        return parseISO(dateStr);
    } catch (error) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
};

// Google Auth route
const googleAuthHandler: RequestHandler = (req, res) => {
    try {
        const oauth2Client = getGoogleAuthClient();

        // Generate auth URL with calendar scopes
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force to get refresh token
        });

        res.redirect(authUrl);
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            error: 'Authentication failed'
        });
    }
};

// Google Auth Callback
const googleAuthCallbackHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            const oauth2Client = getGoogleAuthClient();
            const { code } = req.query;

            if (!code) {
                res.status(400).json({ error: 'Missing authorization code' });
                return;
            }

            // Exchange code for tokens
            const { tokens } = await oauth2Client.getToken(code as string);

            // Store tokens (in memory for this demo)
            if (tokens.access_token) accessToken = tokens.access_token;
            if (tokens.refresh_token) refreshToken = tokens.refresh_token;

            // Redirect to frontend success page
            res.redirect(`${process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000'}/dashboard?auth=success`);
        } catch (error) {
            console.error('Callback error:', error);
            res.redirect(`${process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000'}/auth/signin?error=callback_failed`);
        }
    })();
};

// Get events endpoint
const getEventsHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            const { startDate, endDate, calendarId = 'primary' } = req.query;

            if (!startDate || !endDate) {
                res.status(400).json({
                    error: 'startDate and endDate are required'
                });
                return;
            }

            // Try to use service account auth first, fall back to OAuth client
            let auth;
            try {
                auth = createServiceAuthClient();
                console.log("Using service account authentication for calendar access");
            } catch (serviceAuthError) {
                console.warn("Service account auth failed, falling back to OAuth:", serviceAuthError instanceof Error ? serviceAuthError.message : "Unknown error");
                try {
                    auth = createAuthClient();
                    console.log("Using OAuth authentication for calendar access");
                } catch (oauthError) {
                    res.status(401).json({
                        error: 'Authentication failed. Please set up Google Calendar authentication.',
                        details: oauthError instanceof Error ? oauthError.message : "Unknown error"
                    });
                    return;
                }
            }

            const calendar = google.calendar({ version: 'v3', auth });

            // Parse dates
            const startDateObj = parseDate(startDate as string);
            const endDateObj = parseDate(endDate as string);

            // Ensure the dates are the start and end of the day
            const timeMin = startOfDay(startDateObj).toISOString();
            const timeMax = endOfDay(endDateObj).toISOString();

            console.log(`Fetching events from calendar: ${calendarId} between ${timeMin} and ${timeMax}`);

            // Get events
            const response = await calendar.events.list({
                calendarId: calendarId as string,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100,
            });

            console.log(`Successfully fetched ${response.data.items?.length || 0} events`);

            res.json({
                success: true,
                events: response.data.items
            });
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch calendar events',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    })();
};

// Create event endpoint
const createEventHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            const { title, datetime, duration, calendarId = 'primary' } = req.body;

            if (!title || !datetime || !duration) {
                res.status(400).json({
                    error: 'title, datetime, and duration are required'
                });
                return;
            }

            // Try to use service account auth first, fall back to OAuth client
            let auth;
            try {
                auth = createServiceAuthClient();
                console.log("Using service account authentication for calendar access");
            } catch (serviceAuthError) {
                console.warn("Service account auth failed, falling back to OAuth:", serviceAuthError instanceof Error ? serviceAuthError.message : "Unknown error");
                try {
                    auth = createAuthClient();
                    console.log("Using OAuth authentication for calendar access");
                } catch (oauthError) {
                    res.status(401).json({
                        error: 'Authentication failed. Please set up Google Calendar authentication.',
                        details: oauthError instanceof Error ? oauthError.message : "Unknown error"
                    });
                    return;
                }
            }

            const calendar = google.calendar({ version: 'v3', auth });

            // Parse start time
            let startTime: Date;
            try {
                startTime = parseDate(datetime);
            } catch (error) {
                res.status(400).json({
                    error: `Invalid datetime format: ${datetime}`,
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
                return;
            }

            // Calculate end time
            const endTime = addMinutes(startTime, duration);

            // Create event
            const event = {
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                },
                end: {
                    dateTime: endTime.toISOString(),
                },
            };

            console.log(`Creating event "${title}" in calendar: ${calendarId}`);

            const response = await calendar.events.insert({
                calendarId: calendarId as string,
                requestBody: event,
            });

            console.log(`Event created successfully: ${response.data.htmlLink}`);

            res.json({
                success: true,
                event: response.data
            });
        } catch (error) {
            console.error('Error creating event:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create calendar event',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    })();
};

// Set tokens endpoint
const setTokensHandler: RequestHandler = (req, res) => {
    try {
        const { accessTokenNew, refreshTokenNew } = req.body;

        if (!accessTokenNew || !refreshTokenNew) {
            res.status(400).json({
                error: 'Access token and refresh token are required'
            });
            return;
        }

        accessToken = accessTokenNew;
        refreshToken = refreshTokenNew;

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error setting tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set tokens',
            details: error.message || 'Unknown error'
        });
    }
};

// Auth status endpoint
const authStatusHandler: RequestHandler = (req, res) => {
    const hasOAuth = !!(accessToken && refreshToken);
    let hasServiceAccount = false;

    try {
        // Check if service account credentials are available
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
        hasServiceAccount = !!(serviceAccountEmail && serviceAccountPrivateKey);
    } catch (error) {
        console.warn("Error checking service account:", error);
    }

    res.json({
        success: true,
        authenticated: hasOAuth || hasServiceAccount,
        authMethods: {
            oauth: hasOAuth,
            serviceAccount: hasServiceAccount
        }
    });
};

// Natural language query endpoint
const queryHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            console.log("In queryHandler");
            console.log("Received query request:", req.body);
            const { prompt, calendarId = 'primary' } = req.body;

            if (!prompt) {
                res.status(400).json({
                    error: 'Prompt is required'
                });
                return;
            }

            console.log(`Processing query: "${prompt}"`);

            // Use OpenAI to understand the user's intent
            let intent: CalendarIntent | null = null;
            try {
                intent = await processCalendarPrompt(prompt);
                if (!intent) {
                    throw new Error("Failed to process intent");
                }
            } catch (error: any) {
                console.error("Error processing intent with OpenAI:", error);
                res.status(500).json({
                    error: 'Failed to process your request with our AI',
                    response: "I'm having trouble understanding your request. Please try again with a clearer instruction about your calendar.",
                    details: error.message
                });
                return;
            }

            // Handle different intents
            if (intent.intent === 'get_events') {
                const { startDate: startDateStr, endDate: endDateStr } = intent.timeRange;

                // Determine the date range for the query
                let startDate, endDate;
                try {
                    startDate = parseDate(startDateStr);
                    endDate = parseDate(endDateStr);
                } catch (error: any) {
                    console.error("Error parsing dates:", error);
                    res.status(400).json({
                        error: 'Invalid date format',
                        response: "I couldn't understand the dates in your request. Please try again with clearer date information.",
                        details: error.message
                    });
                    return;
                }

                try {
                    // Try to use service account auth first, fall back to OAuth client
                    let auth;
                    try {
                        auth = createServiceAuthClient();
                        console.log("Using service account authentication for calendar access");
                    } catch (serviceAuthError: unknown) {
                        try {
                            auth = createAuthClient();
                            console.log("Using OAuth authentication for calendar access");
                        } catch (oauthError: unknown) {
                            res.status(401).json({
                                error: 'Authentication failed. Please set up Google Calendar authentication.',
                                details: oauthError instanceof Error ? oauthError.message : "Unknown error"
                            });
                            return;
                        }
                    }

                    const calendar = google.calendar({ version: 'v3', auth });

                    // Ensure the dates are the start and end of the day
                    const timeMin = startOfDay(startDate).toISOString();
                    const timeMax = endOfDay(endDate).toISOString();

                    console.log(`Fetching events from calendar: ${calendarId} between ${timeMin} and ${timeMax}`);

                    // Get events
                    const response = await calendar.events.list({
                        calendarId,
                        timeMin,
                        timeMax,
                        singleEvents: true,
                        orderBy: 'startTime',
                        maxResults: 10,
                    });

                    const events = response.data.items || [];

                    // Generate a human-friendly response with OpenAI
                    const humanResponse = await generateCalendarQueryResponse(
                        events,
                        prompt,
                        format(startDate, 'PPP'),
                        format(endDate, 'PPP')
                    );

                    res.json({
                        response: humanResponse,
                        calendarQueried: true,
                        events
                    });

                } catch (error: any) {
                    console.error('Error fetching events:', error);

                    // Send a mock response in case of error
                    const mockEvents = [
                        {
                            summary: "Mock Team Meeting",
                            start: { dateTime: addHours(new Date(), 3).toISOString() },
                            end: { dateTime: addHours(new Date(), 4).toISOString() }
                        },
                        {
                            summary: "Mock Client Call",
                            start: { dateTime: addHours(addDays(new Date(), 1), 10).toISOString() },
                            end: { dateTime: addHours(addDays(new Date(), 1), 11).toISOString() }
                        }
                    ];

                    // Generate a message for mock data
                    const mockResponse = await generateCalendarQueryResponse(
                        mockEvents,
                        prompt,
                        format(new Date(), 'PPP'),
                        format(addDays(new Date(), 7), 'PPP')
                    );

                    res.json({
                        response: mockResponse + " (Note: Using mock data as the calendar connection failed)",
                        calendarQueried: true,
                        mockData: true,
                        events: mockEvents,
                        error: error.message
                    });
                }
            }
            else if (intent.intent === 'create_event') {
                const { title, datetime: datetimeStr, duration } = intent.eventDetails;

                try {
                    // Try to use service account auth first, fall back to OAuth client
                    let auth;
                    try {
                        auth = createServiceAuthClient();
                        console.log("Using service account authentication for calendar access");
                    } catch (serviceAuthError: unknown) {
                        try {
                            auth = createAuthClient();
                            console.log("Using OAuth authentication for calendar access");
                        } catch (oauthError: unknown) {
                            res.status(401).json({
                                error: 'Authentication failed. Please set up Google Calendar authentication.',
                                details: oauthError instanceof Error ? oauthError.message : "Unknown error"
                            });
                            return;
                        }
                    }

                    const calendar = google.calendar({ version: 'v3', auth });

                    console.log(`Datetime string: ${datetimeStr}`);
                    // Parse start time
                    let startTime;
                    try {
                        startTime = parseDate(datetimeStr);
                    } catch (error) {
                        res.status(400).json({
                            error: `Invalid datetime format: ${datetimeStr}`,
                            response: "I couldn't understand the date and time for your event. Please specify when you want to schedule it more clearly."
                        });
                        return;
                    }

                    // Calculate end time
                    const endTime = addMinutes(startTime, duration);

                    // Create event
                    const event = {
                        summary: title,
                        start: {
                            dateTime: startTime.toISOString(),
                        },
                        end: {
                            dateTime: endTime.toISOString(),
                        },
                    };

                    console.log(`Creating event "${title}" in calendar: ${calendarId}`);

                    const response = await calendar.events.insert({
                        calendarId,
                        requestBody: event,
                    });

                    console.log(`Response from Google Calendar create event: ${JSON.stringify(response.data)}`);

                    if (!response.data) {
                        throw new Error("Failed to create event");
                    }

                    // Generate a human-friendly response with OpenAI
                    const humanResponse = await generateEventCreationResponse(
                        response.data,
                        prompt
                    );

                    res.json({
                        response: humanResponse,
                        eventCreated: true,
                        event: {
                            id: response.data.id,
                            summary: response.data.summary,
                            description: response.data.description,
                            start: response.data.start,
                            end: response.data.end,
                            location: response.data.location,
                            htmlLink: response.data.htmlLink
                        }
                    });

                } catch (error: any) {
                    console.error('Error creating event:', error);

                    // Create mock event for response
                    const mockEvent = {
                        summary: title,
                        start: { dateTime: parseDate(datetimeStr).toISOString() },
                        end: { dateTime: addMinutes(parseDate(datetimeStr), duration).toISOString() },
                    };

                    // Generate a message for mock data
                    const mockResponse = await generateEventCreationResponse(
                        mockEvent,
                        prompt
                    );

                    res.json({
                        response: mockResponse + " (Note: This is a mock event as the calendar connection failed)",
                        eventCreated: true,
                        mockData: true,
                        event: mockEvent,
                        error: error.message
                    });
                }
            }
            else {
                // Handle unknown intent
                res.json({
                    response: intent.description || "I'm not sure what you're asking about your calendar. You can try asking about your upcoming events or create a new event.",
                    intent: 'unknown'
                });
            }
        } catch (error: any) {
            console.error('Error processing natural language query:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process your request',
                details: error.message || 'Unknown error',
                response: "Sorry, I couldn't process that request. Please try again with clearer instructions about your calendar."
            });
        }
    })();
};

// Test endpoint
const testHandler: RequestHandler = (req, res) => {
    console.log("Test endpoint called with method:", req.method);
    console.log("Test endpoint request body:", req.body);

    res.json({
        success: true,
        message: "Test endpoint is working",
        method: req.method,
        receivedData: req.body
    });
};

// Add global error handler middleware
const errorHandler = (err: any, req: Request, res: Response, next: any) => {
    console.error('Global error handler caught:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message || 'Unknown error'
    });
};

// Register routes
router.get('/calendar/events', getEventsHandler);
router.post('/calendar/create', createEventHandler);
router.post('/auth/set-tokens', setTokensHandler);
router.get('/auth/google', googleAuthHandler);
router.get('/auth/callback', googleAuthCallbackHandler);
router.get('/auth/status', authStatusHandler);
router.post('/calendar/query', queryHandler);
router.post('/test', testHandler);
router.get('/test', testHandler); // Add GET support for easier testing

// Register router with prefix
app.use('/api', router);

// Add the error handler after all other middleware and routes
app.use(errorHandler);

// Add a default 404 handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
});

// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`Calendar Copilot API server running on port ${PORT}`);
    console.log(`Service Account configured: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    console.log(`OAuth credentials configured: ${!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}`);
}); 