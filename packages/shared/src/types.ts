// Google Calendar Event related types
export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: EventDateTime;
    end: EventDateTime;
    attendees?: EventAttendee[];
    created?: string;
    updated?: string;
    status?: string;
    htmlLink?: string;
}

export interface EventDateTime {
    dateTime: string;
    timeZone?: string;
}

export interface EventAttendee {
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

// MCP tool types
export interface GetEventsRangeParams {
    startDate: string;
    endDate: string;
}

export interface GetEventsRangeResponse {
    events: CalendarEvent[];
    error?: string;
}

export interface CreateEventParams {
    title: string;
    datetime: string;
    duration: number;
    attendees?: string[];
}

export interface CreateEventResponse {
    success: boolean;
    event?: CalendarEvent;
    error?: string;
} 