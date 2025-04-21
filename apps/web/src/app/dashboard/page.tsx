"use client"

import Link from "next/link"
import { CalendarRange, ChevronLeft, Send, ChevronDown } from "lucide-react"
import { UserButton, useUser, useAuth, useClerk, useSession } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { formatISO, add, format } from "date-fns"
// Replace sonner with our custom toast
import { toast } from "@/components/ui/toast"
// Import any custom components needed
import { EventCard } from "@/components/calendar/EventCard"
import { CalendarModal } from "@/components/calendar/CalendarModal"
import { CalendarWidget } from "@/components/calendar/CalendarWidget"
// Import types
import { CalendarEventType } from "@/types/calendar"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

// Environment variable for the service account email
const SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_SERVICE_ACCOUNT_EMAIL || "calendar-copilot@example-project.iam.gserviceaccount.com";

export default function DashboardPage() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [prompt, setPrompt] = useState("What meetings do I have on my calendar?");
    const [mcpResponse, setMcpResponse] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const { signOut } = useClerk();

    // KEEP THIS HARDCODED FOR NOW
    const [calendarId, setCalendarId] = useState("9cbe1344fc9dcf4a825ea26ccbfb9ea3439856f4cf5ef416e48f6f14551b5bd9@group.calendar.google.com");
    const [savedCalendarId, setSavedCalendarId] = useState<string | null>(null);

    const [isLoadingCal, setIsLoadingCal] = useState(true);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEventType[]>([]);
    const [usingMockData, setUsingMockData] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const session = useSession();

    useEffect(() => {
        // Check for stored calendar ID in localStorage
        const storedCalendarId = localStorage.getItem("googleCalendarId");

        if (storedCalendarId) {
            setCalendarId(storedCalendarId);
            setSavedCalendarId(storedCalendarId);
        }
    }, []);

    // Function to save the calendar ID
    const handleSaveCalendarId = () => {
        if (calendarId.trim()) {
            localStorage.setItem("googleCalendarId", calendarId);
            setSavedCalendarId(calendarId);
            // Refresh events with the new calendar ID
            fetchCalendarEvents();
        }
    };

    // Handle sending prompt to MCP
    const handleSendPrompt = async () => {
        if (!prompt.trim()) return;
        console.log("Sending prompt to Calendar Copilot:", prompt);

        try {
            setIsSending(true);
            setMcpResponse("Processing your request...");

            // Get authentication tokens/headers
            const headers = await getOAuthTokens();

            // Send the prompt to our new OpenAI calendar agent API endpoint
            const response = await fetch("/api/openai-calendar-agent", {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt,
                    calendarId: savedCalendarId
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.response || data.error || `API responded with status: ${response.status}`);
            }

            const data = await response.json();

            // Handle the response
            if (data.response) {
                setMcpResponse(data.response);
            } else if (data.error) {
                setMcpResponse(`Error: ${data.error}`);
            } else {
                setMcpResponse("Received response, but no message was found.");
            }

            // If the intent indicates we should refresh the calendar
            if (data.intent === 'get_events' || data.intent === 'create_event') {
                fetchCalendarEvents();
            }

        } catch (error) {
            console.error("Error sending prompt:", error);
            setMcpResponse(error instanceof Error ? error.message : "Sorry, there was an error processing your request.");
        } finally {
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

    // Function to get OAuth tokens for Google API access
    const getOAuthTokens = async () => {
        // Create a headers object to store all possible authentication credentials
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        try {
            const sessionToken = await getToken();
            if (sessionToken) {
                console.log("Using session token for API request");
                headers["Authorization"] = `Bearer ${sessionToken}`;
            } else {
                console.error("No authentication token available");
            }
        } catch (error) {
            console.error("Failed to get session token:", error);
        }

        return headers;
    };

    // Function to handle creating new calendar event  
    const handleCreateEvent = async (eventData: any) => {
        try {
            console.log("Creating new event:", eventData);

            if (!savedCalendarId) {
                toast.error("Please connect your Google Calendar first");
                return null;
            }

            // Get authentication tokens/headers
            const headers = await getOAuthTokens();

            // Make API call to create event
            const response = await fetch("/api/calendar/create", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    ...eventData,
                    calendarId: savedCalendarId
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create event");
            }

            if (data.mockData) {
                setUsingMockData(true);
                toast.info("Using mock data: " + (data.message || "Real Google Calendar integration not configured"));
            } else {
                toast.success("Event created successfully!");
            }

            // Refresh calendar events after creating a new event
            fetchCalendarEvents();

            // Close the modal
            setIsModalOpen(false);

            return data;
        } catch (error) {
            console.error("Error creating event:", error);
            toast.error("Failed to create event");
            return null;
        }
    };

    // Fetch calendar events
    const fetchCalendarEvents = async () => {
        try {
            if (!savedCalendarId) {
                setCalendarError("Please connect your Google Calendar first");
                setIsLoadingCal(false);
                return;
            }

            setIsLoadingCal(true);
            setCalendarError(null);

            // Calculate date range for next 7 days
            const startDate = new Date();
            const endDate = add(startDate, { days: 7 });

            // Format dates as ISO strings for the API
            const startDateISO = formatISO(startDate);
            const endDateISO = formatISO(endDate);

            // Get authentication tokens/headers
            const headers = await getOAuthTokens();

            // Make API call to get events
            const response = await fetch(
                `/api/calendar/events?startDate=${encodeURIComponent(startDateISO)}&endDate=${encodeURIComponent(endDateISO)}&calendarId=${encodeURIComponent(savedCalendarId)}`,
                { headers }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch calendar events");
            }

            if (data.mockData) {
                setUsingMockData(true);
                console.log("Using mock calendar data:", data.message);
                setCalendarError(data.message || "Using mock calendar data.");
            } else {
                setUsingMockData(false);
            }

            setCalendarEvents(data.events || []);
        } catch (error: any) {
            console.error("Calendar fetch error:", error);
            setCalendarError(error.message || "Failed to load calendar events");
        } finally {
            setIsLoadingCal(false);
        }
    };

    useEffect(() => {
        if (isLoaded && savedCalendarId) {
            fetchCalendarEvents();
        } else if (isLoaded) {
            setIsLoadingCal(false);
        }
    }, [isLoaded, savedCalendarId]);

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
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <UserButton afterSignOutUrl="/" />
            </div>

            <div className="mb-6 p-4 bg-card rounded-lg border shadow-sm">
                <h2 className="text-lg font-semibold mb-2">Welcome, {user?.firstName || 'User'}</h2>
                <p className="text-muted-foreground text-sm">
                    Your Google Calendar is connected. Use Calendar Copilot to interact with your calendar.
                </p>
            </div>
            {/* Google Calendar Integration Section */}
            <div className="p-4 bg-card border rounded-md mb-8">
                <div className="space-y-3 mb-4">
                    <div>
                        <p className="text-sm font-medium mb-1">Your Google Calendar ID:</p>
                        <input
                            type="text"
                            value={calendarId}
                            onChange={(e) => setCalendarId(e.target.value)}
                            placeholder="your.email@gmail.com or calendar ID"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mb-2"
                        />
                        <p className="text-xs text-gray-500">
                            For primary calendars, this is your email address. For secondary calendars, find the Calendar ID in your calendar settings.
                        </p>
                    </div>

                    <button
                        onClick={handleSaveCalendarId}
                        className="h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Connect Calendar
                    </button>
                </div>

                {savedCalendarId ? (
                    <div className="mt-2">
                        <p className="text-sm text-green-600">✓ Calendar connected successfully</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your calendar ID is stored in your browser's local storage.
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        To access your Google Calendar data, provide your Calendar ID above.
                    </p>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Upcoming Events</h2>
                            <CalendarRange className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {isLoadingCal ? (
                            <div className="p-4 text-center">Loading events...</div>
                        ) : (
                            <div className="space-y-4">
                                {calendarError && (
                                    <div className="p-2 mb-2 text-sm text-amber-800 bg-amber-100 rounded-md">
                                        {calendarError}
                                    </div>
                                )}
                                {!savedCalendarId ? (
                                    <div className="text-center p-4 text-muted-foreground">
                                        Please connect your Google Calendar above to view your events
                                    </div>
                                ) : calendarEvents.length === 0 ? (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No upcoming events found
                                    </div>
                                ) : (
                                    calendarEvents.map(event => (
                                        <EventCard key={event.id} event={event} />
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
                                Ask questions about your calendar or create events using natural language
                            </p>
                        </div>

                        {/* Response Display */}
                        <div className="p-6 min-h-[150px] bg-muted/30 relative">
                            {isSending ? (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="animate-pulse w-6 h-6 rounded-full bg-primary/20 mb-2"></div>
                                    <p className="text-sm text-muted-foreground">Processing your request...</p>
                                </div>
                            ) : mcpResponse ? (
                                <div className="whitespace-pre-wrap text-sm">
                                    <p className="text-xs text-muted-foreground mb-2">Calendar Copilot's response:</p>
                                    <div className="p-3 bg-card rounded-md shadow-sm border prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {mcpResponse}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <CalendarRange className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-muted-foreground text-sm">
                                        Ask me about your calendar or to create events using natural language
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Try: "What meetings do I have tomorrow?" or "Schedule a meeting with Joe"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Input Section */}
                        <div className="p-4 flex gap-2 relative">
                            <textarea
                                rows={3}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., What meetings do I have tomorrow?"
                                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md border border-input bg-background"
                                onKeyDown={(e) => e.key === 'Enter' && !isSending && savedCalendarId && prompt.trim() && handleSendPrompt()}
                                disabled={isSending || !savedCalendarId}
                            />
                            <button
                                onClick={handleSendPrompt}
                                className="inline-flex items-center justify-center rounded-md bg-primary h-[38px] w-[100px] px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                disabled={isSending || !prompt.trim() || !savedCalendarId}
                            >
                                {isSending ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full" />
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-1" />
                                        Send
                                    </>
                                )}
                            </button>

                            {/* Example prompts dropdown */}
                            <div className="absolute right-[108px] bottom-[24px] z-10">
                                <div className="relative inline-block w-min-content">
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setPrompt(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="h-7 w-[168px] appearance-none pl-3 pr-8 py-1 text-xs text-muted-foreground bg-transparent hover:bg-accent/30 focus:bg-accent/30 rounded-md cursor-pointer focus:outline-none"
                                        defaultValue=""
                                        aria-label="Sample prompts"
                                    >
                                        <option value="" disabled>More sample prompts</option>
                                        <option value="What meetings do I have this week?">Show this week's meetings</option>
                                        <option value="Do I have any meetings tomorrow?">Check tomorrow's meetings</option>
                                        <option value="Schedule a team meeting titled Weekly Sync for next Monday at 10am for 1 hour">Schedule team meeting</option>
                                        <option value="Create a 30-minute call with Sarah tomorrow afternoon">Create call with Sarah</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-1.5 flex items-center pointer-events-none">
                                        <ChevronDown className="h-3 w-3 opacity-70" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!savedCalendarId && (
                            <div className="p-3 mb-3 text-sm text-amber-800 bg-amber-100 rounded-md mx-4">
                                Please connect your Google Calendar above to use Calendar Copilot
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    {/* Add Calendar Widget */}
                    <div className="mb-6">
                        <CalendarWidget
                            events={calendarEvents}
                            onDateClick={(date) => {
                                // Optional: Handle date clicks, e.g., filter events for this date
                                toast.info(`Selected date: ${format(date, 'PP')}`)
                            }}
                        />
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Mock Data Warning */}
            {usingMockData && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Using mock calendar data. Please ensure you've provided the correct Calendar ID and shared your calendar with our service account.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Section */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Your Calendar</h2>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!savedCalendarId}
                    >
                        Create Event
                    </button>
                </div>

                {isLoadingCal ? (
                    <div className="text-center py-4">
                        <div className="spinner"></div>
                        <p className="mt-2 text-gray-600">Loading your calendar...</p>
                    </div>
                ) : !savedCalendarId ? (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-blue-700">Please connect your Google Calendar above to view your events</p>
                            </div>
                        </div>
                    </div>
                ) : calendarError ? (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{calendarError}</p>
                            </div>
                        </div>
                    </div>
                ) : calendarEvents.length > 0 ? (
                    <div className="space-y-4">
                        {calendarEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>No upcoming events in the next 7 days</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Create your first event
                        </button>
                    </div>
                )}
            </div>

            {/* Calendar Event Modal */}
            <CalendarModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateEvent}
            />
        </div>
    )
} 