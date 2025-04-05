#!/usr/bin/env node
import * as dotenv from 'dotenv';
import express, { Request, Response, Router, RequestHandler } from 'express';
import { google } from 'googleapis';
import { parseISO, addMinutes, format, startOfDay, endOfDay, addDays } from 'date-fns';

// Load environment variables
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
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google API credentials');
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

// Create Google OAuth client for auth
const getGoogleAuthClient = () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Missing Google API credentials');
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
            res.redirect('http://localhost:3000/dashboard?auth=success');
        } catch (error) {
            console.error('Callback error:', error);
            res.redirect('http://localhost:3000/auth/signin?error=callback_failed');
        }
    })();
};

// Get events endpoint
const getEventsHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                res.status(400).json({
                    error: 'startDate and endDate are required'
                });
                return;
            }

            const auth = createAuthClient();
            const calendar = google.calendar({ version: 'v3', auth });

            // Parse dates
            const startDateObj = parseDate(startDate as string);
            const endDateObj = parseDate(endDate as string);

            // Ensure the dates are the start and end of the day
            const timeMin = startOfDay(startDateObj).toISOString();
            const timeMax = endOfDay(endDateObj).toISOString();

            // Get events
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });

            res.json({ events: response.data.items });
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({
                error: 'Failed to fetch calendar events'
            });
        }
    })();
};

// Create event endpoint
const createEventHandler: RequestHandler = (req, res) => {
    (async () => {
        try {
            const { title, datetime, duration, attendees = [] } = req.body;

            if (!title || !datetime || !duration) {
                res.status(400).json({
                    error: 'title, datetime, and duration are required'
                });
                return;
            }

            const auth = createAuthClient();
            const calendar = google.calendar({ version: 'v3', auth });

            // Parse start time
            let startTime: Date;
            try {
                startTime = parseDate(datetime);
            } catch (error) {
                res.status(400).json({
                    error: `Invalid datetime format: ${datetime}`
                });
                return;
            }

            // Calculate end time
            const endTime = addMinutes(startTime, duration);

            // Format attendees
            const formattedAttendees = attendees.map((email: string) => ({ email }));

            // Create event
            const event = {
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                },
                end: {
                    dateTime: endTime.toISOString(),
                },
                attendees: formattedAttendees,
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });

            res.json({
                success: true,
                event: response.data
            });
        } catch (error) {
            console.error('Error creating event:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create calendar event'
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
    } catch (error) {
        console.error('Error setting tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set tokens'
        });
    }
};

// Auth status endpoint
const authStatusHandler: RequestHandler = (req, res) => {
    res.json({
        authenticated: !!(accessToken && refreshToken)
    });
};

// Register routes
router.get('/calendar/events', getEventsHandler);
router.post('/calendar/create', createEventHandler);
router.post('/auth/set-tokens', setTokensHandler);
router.get('/auth/google', googleAuthHandler);
router.get('/auth/callback', googleAuthCallbackHandler);
router.get('/auth/status', authStatusHandler);

// Register router with prefix
app.use('/api', router);

// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`Calendar Copilot API server running on port ${PORT}`);
}); 