"use client"

import { format } from "date-fns"
import { CalendarClock, MapPin, Users } from "lucide-react"

// Define CalendarEventType interface if it's not imported from elsewhere
interface CalendarEventType {
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
    }>
    htmlLink?: string
}

interface EventCardProps {
    event: CalendarEventType
}

export function EventCard({ event }: EventCardProps) {
    // Format the date for display
    const formatEventDate = (dateString: string) => {
        const date = new Date(dateString)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        if (date.toDateString() === today.toDateString()) {
            return "Today"
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow"
        } else {
            return format(date, "EEE, MMM d")
        }
    }

    // Format the time for display
    const formatEventTime = (dateString: string) => {
        const date = new Date(dateString)
        return format(date, "h:mm a")
    }

    return (
        <div className="bg-white border rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{event.summary}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {formatEventDate(event.start.dateTime)}
                </span>
            </div>

            <div className="text-sm text-gray-600 flex items-center mb-2">
                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                <span>
                    {formatEventTime(event.start.dateTime)} - {formatEventTime(event.end.dateTime)}
                </span>
            </div>

            {event.location && (
                <div className="text-xs text-gray-500 flex items-center mb-2">
                    <MapPin className="h-3 w-3 mr-1.5" />
                    <span>{event.location}</span>
                </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
                <div className="text-xs text-gray-500 flex items-start">
                    <Users className="h-3 w-3 mr-1.5 mt-0.5" />
                    <span>
                        {event.attendees.map(a => a.displayName || a.email).join(", ")}
                    </span>
                </div>
            )}

            {event.description && (
                <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                    {event.description}
                </p>
            )}
        </div>
    )
} 