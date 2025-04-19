"use client"

import Link from "next/link"
import { CalendarRange, ChevronLeft, Send } from "lucide-react"
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
    const [prompt, setPrompt] = useState("");
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

        try {
            setIsSending(true);
            setMcpResponse("Processing your request...");

            // Simplified: Check for event creation pattern
            if (prompt.toLowerCase().includes("schedule") || prompt.toLowerCase().includes("create event")) {
                // Extract event details (simplified example)
                const title = prompt.includes("titled")
                    ? prompt.split("titled")[1].trim().split(" ")[0]
                    : "New Event";

                const duration = prompt.includes("for") && prompt.includes("minutes")
                    ? parseInt(prompt.split("for ")[1].split(" minutes")[0])
                    : 30;

                // Use current datetime for simplicity
                const datetime = new Date();
                datetime.setHours(datetime.getHours() + 1); // 1 hour from now

                // Create the event via our API
                const headers = await getOAuthTokens();

                const createResponse = await fetch("/api/calendar/create", {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        title,
                        datetime: datetime.toISOString(),
                        duration,
                        attendees: [],
                        calendarId: savedCalendarId
                    })
                });

                const eventData = await createResponse.json();

                if (eventData.event) {
                    // Refresh the event list
                    fetchCalendarEvents();

                    setMcpResponse(`Event "${title}" created successfully${eventData.mockData ? " (mock)" : ""}. It has been added to your calendar.`);
                } else {
                    setMcpResponse(`Failed to create event: ${eventData.error}`);
                }
            } else {
                // Handle query prompt (simplified)
                setMcpResponse(`I processed your request: "${prompt}"\n\nThis is a simulated response.`);
            }
        } catch (error) {
            console.error("Error sending prompt:", error);
            setMcpResponse("Sorry, there was an error processing your request.");
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
                <h2 className="text-lg font-semibold mb-3">Google Calendar Integration</h2>

                <div className="mb-4">
                    <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md border border-blue-200">
                        <strong>Setup Instructions:</strong>
                        <ol className="list-decimal ml-5 mt-1">
                            <li>Go to your <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Calendar Settings</a></li>
                            <li>Under "Settings for my calendars," click on the calendar you want to use</li>
                            <li>Scroll down to "Share with specific people or groups"</li>
                            <li>Add our service account email: <code className="bg-gray-100 px-1">{SERVICE_ACCOUNT_EMAIL}</code></li>
                            <li>Set permission to "Make changes to events"</li>
                            <li>Copy your Calendar ID from the "Integrate calendar" section below</li>
                        </ol>
                    </p>
                </div>

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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Google Calendar Integration Setup</h3>
                <p className="text-sm text-blue-700 mb-2">
                    This app uses a service account to access your Google Calendar. To enable integration:
                </p>
                <ol className="text-sm text-blue-700 ml-4 list-decimal space-y-1">
                    <li>Enter your Gmail or Google Workspace email as your Calendar ID below</li>
                    <li>Share your calendar with our service account: <code className="bg-blue-100 px-1">{process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'service-account@example.com'}</code></li>
                    <li>Give the service account "Make changes to events" permission</li>
                </ol>
                <p className="text-sm text-blue-700 mt-2">
                    <a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noopener noreferrer" className="underline">
                        Open your Google Calendar settings →
                    </a>
                </p>
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
                                disabled={isSending || !savedCalendarId}
                            />
                            <button
                                onClick={handleSendPrompt}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                                disabled={isSending || !prompt.trim() || !savedCalendarId}
                            >
                                <Send className="h-4 w-4 mr-1" />
                                Send
                            </button>
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