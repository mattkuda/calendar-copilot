import { google } from 'googleapis';
import { parseISO, addMinutes, format, startOfDay, endOfDay, addDays } from 'date-fns';

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
export const executeGetEventsRange = async (startDateStr: string, endDateStr: string, calendarId: string = 'primary') => {
    try {
        const auth = createServiceAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        const startDate = parseDate(startDateStr);
        const endDate = parseDate(endDateStr);

        const timeMin = startOfDay(startDate).toISOString();
        const timeMax = endOfDay(endDate).toISOString();

        console.log(`[GoogleCalendar] Fetching events from calendar: ${calendarId} between ${timeMin} and ${timeMax}`);

        const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 100, // Limit results
        });

        console.log(`[GoogleCalendar] Successfully fetched ${response.data.items?.length || 0} events`);
        return response.data.items || [];

    } catch (error: any) {
        console.error('[GoogleCalendar] Error fetching events:', error);
        // Re-throw a more specific error or handle it
        throw new Error(`Failed to fetch Google Calendar events: ${error.message}`);
    }
};

/**
 * Executes the logic to create a new event using Service Account.
 * @param title Event title
 * @param datetimeStr Event start datetime string (ISO or natural language)
 * @param durationMinutes Event duration in minutes
 * @param attendees List of attendee emails (optional)
 * @param calendarId Google Calendar ID (defaults to 'primary')
 * @returns Promise<CalendarEvent>
 */
export const executeCreateEvent = async (
    title: string,
    datetimeStr: string,
    durationMinutes: number,
    attendees: string[] = [],
    calendarId: string = 'primary'
) => {
    try {
        const auth = createServiceAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        let startTime: Date;
        try {
            startTime = parseDate(datetimeStr);
        } catch (error: any) {
            throw new Error(`Invalid datetime format: ${datetimeStr}. ${error.message}`);
        }

        const endTime = addMinutes(startTime, durationMinutes);
        const formattedAttendees = attendees.map(email => ({ email }));

        const event = {
            summary: title,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use system timezone
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            attendees: formattedAttendees,
        };

        console.log(`[GoogleCalendar] Creating event "${title}" in calendar: ${calendarId}`);

        const response = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
            sendUpdates: attendees.length > 0 ? 'all' : 'none',
        });

        console.log(`[GoogleCalendar] Event created successfully: ${response.data.htmlLink}`);
        return response.data; // Return the created event object

    } catch (error: any) {
        console.error('[GoogleCalendar] Error creating event:', error);
        throw new Error(`Failed to create Google Calendar event: ${error.message}`);
    }
}; 