'use client'

import Link from "next/link"
import { CalendarRange, ChevronLeft } from "lucide-react"
import { UserButton, useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"

// Define a basic type for calendar events
interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    attendees: string[];
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // For now, use mock data
    useEffect(() => {
        // In a real app, we would fetch events from the API
        // For demo, we'll use mock data
        setEvents([
            {
                id: "1",
                title: "Team Standup",
                date: "Today",
                time: "10:00 AM - 10:30 AM",
                attendees: ["john@example.com", "sarah@example.com"]
            },
            {
                id: "2",
                title: "Project Review",
                date: "Tomorrow",
                time: "2:00 PM - 3:00 PM",
                attendees: ["boss@example.com", "client@example.com"]
            },
            {
                id: "3",
                title: "Lunch with Jane",
                date: "Friday",
                time: "12:30 PM - 1:30 PM",
                attendees: ["jane@example.com"]
            }
        ]);
        setIsLoading(false);
    }, []);

    if (!isLoaded) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <Link
                    href="/"
                    className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to Home
                </Link>
                <h1 className="text-2xl font-bold">Calendar Dashboard</h1>
                <UserButton afterSignOutUrl="/" />
            </div>

            <div className="mb-6 p-4 bg-card rounded-lg border shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Welcome, {user?.firstName || 'User'}</h2>
                <p className="text-muted-foreground text-sm">
                    Your Google Calendar is connected. Use Claude to interact with your calendar.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Upcoming Events</h2>
                            <CalendarRange className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {isLoading ? (
                            <div className="p-4 text-center">Loading events...</div>
                        ) : (
                            <div className="space-y-4">
                                {events.map(event => (
                                    <div key={event.id} className="flex flex-col space-y-2 p-4 rounded-md border">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-medium">{event.title}</h3>
                                            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                {event.date}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {event.time}
                                        </div>
                                        {event.attendees.length > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                                With: {event.attendees.join(", ")}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Claude Integration</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Ask Claude about your calendar or create new events using natural language.
                        </p>
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Example Prompts</h3>
                            <ul className="text-sm space-y-2">
                                <li className="p-2 bg-muted rounded-md">"What meetings do I have next week?"</li>
                                <li className="p-2 bg-muted rounded-md">"Schedule a 30-minute meeting with Joe on Thursday at 2pm"</li>
                                <li className="p-2 bg-muted rounded-md">"What's on my calendar for tomorrow?"</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 