import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { parseISO, addMinutes } from "date-fns";

export async function POST(request: Request) {
    try {
        console.log("Calendar create endpoint called");

        // Verify the user is authenticated with Clerk
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. User not authenticated." },
                { status: 401 }
            );
        }

        // Parse the request body
        const body = await request.json();
        const { title, datetime, duration = 30, attendees = [] as string[], calendarId } = body;

        // Validate required fields
        if (!title || !datetime) {
            return NextResponse.json(
                { error: "Title and datetime are required" },
                { status: 400 }
            );
        }

        if (!calendarId) {
            return NextResponse.json(
                { error: "Calendar ID is required" },
                { status: 400 }
            );
        }

        let startDateTime: Date;
        try {
            // Parse the datetime
            startDateTime = parseISO(datetime);
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid datetime format. Use ISO format (e.g. 2023-01-01T09:00:00Z)" },
                { status: 400 }
            );
        }

        // Calculate the end time based on duration (in minutes)
        const endDateTime = addMinutes(startDateTime, parseInt(duration.toString()));

        // Format attendees
        const formattedAttendees = attendees.map((email: string) => ({ email }));

        // Check if we have service account credentials
        const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

        if (!serviceAccountPrivateKey || !serviceAccountEmail) {
            console.warn("Service account credentials missing - cannot create real calendar event");
            return NextResponse.json({
                event: null,
                error: "Service account not configured",
                message: "To create real Google Calendar events, please set up service account credentials in your environment variables."
            }, { status: 500 });
        }

        try {
            // Initialize JWT client with service account
            const jwtClient = new google.auth.JWT({
                email: serviceAccountEmail,
                key: serviceAccountPrivateKey,
                scopes: ['https://www.googleapis.com/auth/calendar']
            });

            // Create calendar client
            const calendar = google.calendar({ version: 'v3', auth: jwtClient });

            // Create the event
            const event = {
                summary: title,
                start: {
                    dateTime: startDateTime.toISOString(),
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                },
                attendees: formattedAttendees,
            };

            console.log(`Attempting to create event in calendar: ${calendarId}`);

            // Insert the event into the specified calendar
            const response = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: event,
                sendUpdates: 'all', // Send emails to attendees
            });

            console.log(`Event created successfully: ${response.data.htmlLink}`);

            return NextResponse.json({
                success: true,
                event: response.data
            });

        } catch (error: any) {
            console.error("Error creating Google Calendar event:", error);

            // Check for specific error types
            let errorMessage = "Failed to create event.";
            let statusCode = 500;

            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = "Calendar not found. Please check your Calendar ID and ensure you've shared it with the service account.";
                    statusCode = 404;
                } else if (error.response.status === 403) {
                    errorMessage = "Access denied. The service account doesn't have permission to create events in this calendar.";
                    statusCode = 403;
                } else {
                    errorMessage = `Google API error: ${error.response.status} ${error.response.statusText}`;
                }

                console.error(`Google API error response: ${JSON.stringify(error.response.data)}`);
            }

            return NextResponse.json({
                success: false,
                error: errorMessage,
                details: error.message || "Unknown error"
            }, { status: statusCode });
        }
    } catch (error: any) {
        console.error("Unexpected error in calendar create endpoint:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create calendar event",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
} 