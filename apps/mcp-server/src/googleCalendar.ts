import { google } from 'googleapis';
import { parseISO, addMinutes, format, startOfDay, endOfDay, addDays } from 'date-fns';

// Mock tokens - in a production app, store securely
// In MVP, tokens would be passed from the frontend after OAuth flow
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

// Parse natural language dates
const parseDate = (dateStr: string): Date => {
    // Handle natural language dates
    if (dateStr.toLowerCase() === 'today') {
        return new Date();
    } else if (dateStr.toLowerCase() === 'tomorrow') {
        return addDays(new Date(), 1);
    } else if (dateStr.toLowerCase() === 'next week') {
        return addDays(new Date(), 7);
    } else if (dateStr.toLowerCase().includes('next')) {
        // Handle "next monday", "next tuesday", etc.
        const dayMap: Record<string, number> = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
        };

        const dayName = dateStr.toLowerCase().replace('next ', '');
        const targetDay = dayMap[dayName];

        if (targetDay !== undefined) {
            const today = new Date();
            const currentDay = today.getDay();
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            return addDays(today, daysUntilTarget === 0 ? 7 : daysUntilTarget);
        }
    }

    // Try to parse as ISO date
    try {
        return parseISO(dateStr);
    } catch (error) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
};

// Get events for a date range
export const getEvents = async (startDateStr: string, endDateStr: string) => {
    try {
        const auth = createAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        // Parse dates
        const startDate = parseDate(startDateStr);
        const endDate = parseDate(endDateStr);

        // Ensure the dates are the start and end of the day
        const timeMin = startOfDay(startDate).toISOString();
        const timeMax = endOfDay(endDate).toISOString();

        // Get events
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Format events for better readability
        const formattedEvents = (response.data.items || []).map(event => {
            return {
                id: event.id,
                summary: event.summary,
                description: event.description,
                start: event.start,
                end: event.end,
                location: event.location,
                attendees: event.attendees,
                htmlLink: event.htmlLink
            };
        });

        return formattedEvents;
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
};

// Create a new event
export const createEvent = async (
    title: string,
    datetimeStr: string,
    durationMinutes: number,
    attendees: string[] = []
) => {
    try {
        const auth = createAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        // Parse start time
        let startTime: Date;
        try {
            startTime = parseDate(datetimeStr);
        } catch (error) {
            throw new Error(`Invalid datetime format: ${datetimeStr}`);
        }

        // Calculate end time
        const endTime = addMinutes(startTime, durationMinutes);

        // Format attendees
        const formattedAttendees = attendees.map(email => ({ email }));

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

        return {
            id: response.data.id,
            summary: response.data.summary,
            description: response.data.description,
            start: response.data.start,
            end: response.data.end,
            location: response.data.location,
            attendees: response.data.attendees,
            htmlLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

// Set tokens (this would be called after OAuth flow in the web app)
export const setTokens = (newAccessToken: string, newRefreshToken: string) => {
    accessToken = newAccessToken;
    refreshToken = newRefreshToken;
}; 