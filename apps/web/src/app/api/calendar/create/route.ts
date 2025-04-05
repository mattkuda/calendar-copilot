import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";
import { parseISO, addMinutes } from "date-fns";

export async function POST(request: Request) {
    try {
        // Get the session
        const session = await getServerSession(authOptions);

        if (!session || !session.accessToken) {
            return NextResponse.json(
                { error: "Not authenticated" },
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

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        // Set credentials
        oauth2Client.setCredentials({
            access_token: session.accessToken as string,
        });

        // Initialize Google Calendar API
        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Parse start time
        let startTime: Date;
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

        // Format attendees
        const formattedAttendees = attendees.map((email: string) => ({ email }));

        // Create event
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
        console.error("Error creating event:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create calendar event" },
            { status: 500 }
        );
    }
} 