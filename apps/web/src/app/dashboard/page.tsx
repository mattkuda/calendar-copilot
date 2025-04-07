'use client'

import Link from "next/link"
import { CalendarRange, ChevronLeft, Send } from "lucide-react"
import { UserButton, useUser, useAuth, useClerk } from "@clerk/nextjs"
import { useEffect, useState } from "react"

// Define a basic type for calendar events
interface CalendarEvent {
    id: string;
    summary: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
}

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [mcpResponse, setMcpResponse] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const { signOut } = useClerk();

    // Fetch real calendar events directly from Google
    useEffect(() => {
        const fetchEventsFromGoogle = async () => {
            try {
                console.log("Fetching events from Google");
                setIsLoading(true);
                setCalendarError(null);

                // Calculate dates for the next 7 days
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);

                // Format dates for the API
                const startDate = today.toISOString();
                const endDate = nextWeek.toISOString();

                // First try to get Google OAuth token
                let token;
                try {
                    // Try to get the Google-specific OAuth token
                    token = await getToken({ template: "oauth_google" });
                    console.log("Got Google OAuth token:", !!token);
                } catch (tokenError) {
                    console.error("Error getting Google OAuth token:", tokenError);
                    // If that fails, fall back to the regular session token
                    token = await getToken();
                    console.log("Fell back to regular session token:", !!token);
                }

                if (!token) {
                    throw new Error("No authentication token available");
                }

                // Call our backend API that will use the token to fetch calendar events
                const response = await fetch(`/api/calendar/events?startDate=${startDate}&endDate=${endDate}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errText = await response.text();
                    console.error('API error:', errText);
                    throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                setEvents(data.events || []);

                // Show a warning if we're using mock data
                if (data.mockData) {
                    setCalendarError(data.message || "Using mock calendar data.");
                }
            } catch (error) {
                console.error('Error fetching events:', error);
                // Set appropriate error message
                if (!calendarError) {
                    setCalendarError("Couldn't load calendar events. Using mock data instead.");
                }

                // Fallback to mock data
                setEvents([
                    {
                        id: "1",
                        summary: "Team Standup",
                        start: {
                            dateTime: new Date().toISOString(),
                        },
                        end: {
                            dateTime: new Date(new Date().getTime() + 30 * 60000).toISOString(),
                        },
                        attendees: [
                            { email: "john@example.com" },
                            { email: "sarah@example.com" }
                        ]
                    },
                    {
                        id: "2",
                        summary: "Project Review",
                        start: {
                            dateTime: new Date(new Date().getTime() + 24 * 3600000).toISOString(),
                        },
                        end: {
                            dateTime: new Date(new Date().getTime() + 24 * 3600000 + 60 * 60000).toISOString(),
                        },
                        attendees: [
                            { email: "boss@example.com" },
                            { email: "client@example.com" }
                        ]
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        };

        if (isLoaded && user) {
            fetchEventsFromGoogle();
        }
    }, [isLoaded, user, getToken, calendarError]);

    // Handle sending prompt to MCP
    const handleSendPrompt = async () => {
        if (!prompt.trim()) return;

        try {
            setIsSending(true);
            setMcpResponse("Processing your request...");

            // For development, simulate a response
            setTimeout(() => {
                setMcpResponse(`Response for: "${prompt}"\n\nI've processed your request about the calendar. In a full implementation, this would connect to the MCP server.`);
                setIsSending(false);
                setPrompt("");
            }, 1500);

            // Actual implementation (uncomment when MCP server is ready)
            /* 
            // Send the prompt to the MCP server
            const response = await fetch(`${process.env.NEXT_PUBLIC_MCP_SERVER_URL}/api/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error('Failed to process request');
            }

            const data = await response.json();
            setMcpResponse(data.response || "Sorry, I couldn't process that request");

            // Clear the input after sending
            setPrompt("");
            */

        } catch (error) {
            console.error('Error sending prompt:', error);
            setMcpResponse("Sorry, there was an error processing your request.");
            setIsSending(false);
        }
    };

    // Format date for display
    const formatEventDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return "Tomorrow";
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }
    };

    // Format time for display
    const formatEventTime = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${startTime} - ${endTime}`;
    };

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
                    Your Google Calendar is connected. Use Calendar Copilot to interact with your calendar.
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
                                {calendarError && (
                                    <div className="p-2 mb-2 text-sm text-amber-800 bg-amber-100 rounded-md">
                                        {calendarError}
                                    </div>
                                )}
                                {events.length === 0 ? (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No upcoming events found
                                    </div>
                                ) : (
                                    events.map(event => (
                                        <div key={event.id} className="flex flex-col space-y-2 p-4 rounded-md border">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-medium">{event.summary}</h3>
                                                <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                    {formatEventDate(event.start.dateTime)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {formatEventTime(event.start.dateTime, event.end.dateTime)}
                                            </div>
                                            {event.attendees && event.attendees.length > 0 && (
                                                <div className="text-xs text-muted-foreground">
                                                    With: {event.attendees.map(a => a.email).join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* MCP Interaction Section */}
                    <div className="mt-6 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-semibold">Calendar Copilot</h2>
                            <p className="text-sm text-muted-foreground">
                                Ask questions or create events using natural language
                            </p>
                        </div>

                        {/* Response Display */}
                        <div className="p-4 min-h-[100px] bg-muted/30">
                            {mcpResponse ? (
                                <div className="whitespace-pre-wrap">{mcpResponse}</div>
                            ) : (
                                <div className="text-muted-foreground text-sm">
                                    Ask me about your calendar or to create events
                                </div>
                            )}
                        </div>

                        {/* Input Section */}
                        <div className="p-4 flex gap-2">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., What meetings do I have tomorrow?"
                                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md border border-input bg-background"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
                                disabled={isSending}
                            />
                            <button
                                onClick={handleSendPrompt}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                disabled={isSending || !prompt.trim()}
                            >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Example Prompts</h2>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground mb-2">
                                Try asking Calendar Copilot:
                            </p>
                            <ul className="text-sm space-y-2">
                                <li onClick={() => setPrompt("What meetings do I have next week?")}
                                    className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80">
                                    "What meetings do I have next week?"
                                </li>
                                <li onClick={() => setPrompt("Schedule a 30-minute meeting with Joe on Thursday at 2pm")}
                                    className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80">
                                    "Schedule a 30-minute meeting with Joe on Thursday at 2pm"
                                </li>
                                <li onClick={() => setPrompt("What's on my calendar for tomorrow?")}
                                    className="p-2 bg-muted rounded-md cursor-pointer hover:bg-muted/80">
                                    "What's on my calendar for tomorrow?"
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
} 