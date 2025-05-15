import { google } from 'googleapis';
import { parseISO, addDays } from 'date-fns';

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

// Parse natural language or ISO dates (can be moved to shared utils if preferred)
const parseDate = (dateStr: string): Date => {
    if (!dateStr) {
        throw new Error('Empty date string provided');
    }
    const normalizedStr = dateStr.trim().toLowerCase();
    if (normalizedStr === 'today') return new Date();
    if (normalizedStr === 'tomorrow') return addDays(new Date(), 1);
    if (normalizedStr === 'next week') return addDays(new Date(), 7);
    // Add more natural language parsing if needed...

    try {
        const parsed = parseISO(dateStr);
        if (isNaN(parsed.getTime())) {
            throw new Error(`Invalid date value from parseISO: ${dateStr}`);
        }
        return parsed;
    } catch (error) {
        throw new Error(`Could not parse date: "${dateStr}". Ensure format is ISO (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).`);
    }
};

/**
 * Executes the logic to get events for a date range using Service Account.
 * @param startDateStr Start date string (ISO or natural language)
 * @param endDateStr End date string (ISO or natural language)
 * @param calendarId Google Calendar ID (defaults to 'primary')
 * @returns Promise<Array<CalendarEvent>>
 */
export async function executeGetEventsRange(startDate: string, endDate: string, calendarId: string = 'primary') {
    try {
        const auth = createServiceAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        const timeMin = new Date(startDate).toISOString();
        const timeMax = new Date(endDate).toISOString();

        const response = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items || [];
    } catch (error: any) {
        throw error;
    }
}

/**
 * Executes the logic to create a new event using Service Account.
 * @param title Event title
 * @param datetimeStr Event start datetime string (ISO or natural language)
 * @param durationMinutes Event duration in minutes
 * @param attendees List of attendee emails (optional)
 * @param calendarId Google Calendar ID (defaults to 'primary')
 * @returns Promise<CalendarEvent>
 */
export async function executeCreateEvent(title: string, datetime: string, duration: number, attendees: string[] = [], calendarId: string = 'primary') {
    try {
        const auth = createServiceAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        const startTime = new Date(datetime);
        const endTime = new Date(startTime.getTime() + duration * 60000);

        const event = {
            summary: title,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC',
            },
            attendees: attendees.map(email => ({ email })),
        };

        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });

        return response.data;
    } catch (error: any) {
        throw error;
    }
} 