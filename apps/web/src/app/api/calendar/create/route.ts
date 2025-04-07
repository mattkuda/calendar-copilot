import { NextResponse } from "next/server";
import { google } from "googleapis";
import { parseISO, addMinutes } from "date-fns";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
    try {
        // Get the authorization header containing the token
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Missing or invalid authorization token" },
                { status: 401 }
            );
        }

        // Verify the user is authenticated with Clerk
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. User not authenticated." },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { title, datetime, duration, attendees = [] } = body;

        if (!title || !datetime || !duration) {
            return NextResponse.json(
                { error: "title, datetime, and duration are required" },
                { status: 400 }
            );
        }

        // Parse start time
        let startTime;
        try {
            startTime = parseISO(datetime);
        } catch (error) {
            return NextResponse.json(
                { error: `Invalid datetime format: ${datetime}` },
                { status: 400 }
            );
        }

        // Calculate end time
        const endTime = addMinutes(startTime, duration);

        // Format attendees with explicit type annotation
        const formattedAttendees = attendees.map((email: string) => ({ email }));

        // Try to create an actual Google Calendar event
        try {
            const token = authHeader.split("Bearer ")[1];

            // Use the token to initialize Google Calendar API
            const calendar = google.calendar({
                version: "v3",
                auth: token,
            });

            // Create the event
            const event = {
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                },
                end: {
                    dateTime: endTime.toISOString(),
                },
                attendees: formattedAttendees,
            };

            const response = await calendar.events.insert({
                calendarId: "primary",
                requestBody: event,
            });

            return NextResponse.json({
                success: true,
                event: response.data
            });
        } catch (error) {
            console.error("Error with Google Calendar API:", error);

            // For development, create a mock event as a fallback
            const mockEvent = {
                id: `event-${Date.now()}`,
                summary: title,
                start: {
                    dateTime: startTime.toISOString(),
                },
                end: {
                    dateTime: endTime.toISOString(),
                },
                attendees: formattedAttendees,
                status: "confirmed",
                htmlLink: "https://calendar.google.com/calendar/event?eid=mock"
            };

            // Return mock event creation result with explanation
            return NextResponse.json({
                success: true,
                mockData: true,
                event: mockEvent,
                message: "Using mock data. To create real Google Calendar events, make sure you've configured Google OAuth in Clerk and granted the necessary Calendar scopes."
            });
        }
    } catch (error) {
        console.error("Error creating event:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create calendar event" },
            { status: 500 }
        );
    }
} 