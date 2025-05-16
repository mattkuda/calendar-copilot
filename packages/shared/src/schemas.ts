import { z } from 'zod';

// Event schemas
export const EventDateTimeSchema = z.object({
    dateTime: z.string(),
    timeZone: z.string().optional()
});

export const EventAttendeeSchema = z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
    responseStatus: z.enum(['needsAction', 'declined', 'tentative', 'accepted']).optional()
});

export const CalendarEventSchema = z.object({
    id: z.string().optional(),
    summary: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: EventDateTimeSchema,
    end: EventDateTimeSchema,
    attendees: z.array(EventAttendeeSchema).optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    status: z.string().optional(),
    htmlLink: z.string().optional()
});

// MCP tool schemas
export const GetEventsRangeParamsSchema = z.object({
    startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'),
    endDate: z.string().describe('End date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)')
});

export const GetEventsRangeResponseSchema = z.object({
    events: z.array(CalendarEventSchema),
    error: z.string().optional()
});

export const CreateEventParamsSchema = z.object({
    title: z.string().describe('Title of the event'),
    datetime: z.string().describe('Start date and time of the event in ISO format (YYYY-MM-DDTHH:MM:SS)'),
    duration: z.number().describe('Duration of the event in minutes'),
    attendees: z.array(z.string().email()).optional().describe('List of email addresses of attendees')
});

export const CreateEventResponseSchema = z.object({
    success: z.boolean(),
    event: CalendarEventSchema.optional(),
    error: z.string().optional()
}); 