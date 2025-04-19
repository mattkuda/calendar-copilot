// Calendar Event Types

export interface CalendarEventType {
    id?: string
    summary: string
    description?: string
    location?: string
    start: {
        dateTime: string
        timeZone?: string
    }
    end: {
        dateTime: string
        timeZone?: string
    }
    attendees?: Array<{
        email: string
        displayName?: string
        responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    }>
    created?: string
    updated?: string
    status?: string
    htmlLink?: string
}

export interface CreateEventParams {
    title: string
    datetime: string
    duration: number
    attendees?: string[]
}

export interface CalendarResponse {
    events: CalendarEventType[]
    mockData?: boolean
    message?: string
    error?: string
} 