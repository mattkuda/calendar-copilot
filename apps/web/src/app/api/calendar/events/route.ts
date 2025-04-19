import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { parseISO } from "date-fns";

export async function GET(request: Request) {
    try {
        console.log("Calendar events endpoint called");

        // Verify the user is authenticated with Clerk
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. User not authenticated." },
                { status: 401 }
            );
        }

        // Get URL parameters
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        const calendarId = searchParams.get("calendarId");

        // Validate required parameters
        if (!startDateParam || !endDateParam) {
            return NextResponse.json(
                { error: "startDate and endDate are required parameters" },
                { status: 400 }
            );
        }

        if (!calendarId) {
            return NextResponse.json(
                { error: "calendarId is required" },
                { status: 400 }
            );
        }

        let startDate: Date;
        let endDate: Date;

        try {
            // Parse dates from ISO strings
            startDate = parseISO(startDateParam);
            endDate = parseISO(endDateParam);
        } catch (error) {
            return NextResponse.json(
                { error: "Invalid date format. Use ISO format (e.g. 2023-01-01T00:00:00Z)" },
                { status: 400 }
            );
        }

        // Check if we have service account credentials
        const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
        const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

        if (!serviceAccountPrivateKey || !serviceAccountEmail) {
            console.warn("Service account credentials missing - cannot fetch real calendar events");
            return NextResponse.json({
                events: [],
                error: "Service account not configured",
                message: "To fetch real Google Calendar events, please set up service account credentials in your environment variables."
            }, { status: 500 });
        }

        try {
            // Initialize JWT client with service account
            const jwtClient = new google.auth.JWT({
                email: serviceAccountEmail,
                key: serviceAccountPrivateKey,
                scopes: ['https://www.googleapis.com/auth/calendar.readonly']
            });

            // Create calendar client
            const calendar = google.calendar({ version: 'v3', auth: jwtClient });

            console.log(`Fetching events from calendar: ${calendarId} between ${startDate.toISOString()} and ${endDate.toISOString()}`);

            // Fetch events
            const calendarResponse = await calendar.events.list({
                calendarId: calendarId,
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 100, // Limit number of results
            });

            console.log(`Successfully fetched ${calendarResponse.data.items?.length || 0} events`);

            return NextResponse.json({
                success: true,
                events: calendarResponse.data.items || []
            });

        } catch (error: any) {
            console.error("Error accessing Google Calendar:", error);

            // Check for specific error types
            let errorMessage = "Failed to access Google Calendar.";
            let statusCode = 500;

            if (error.response) {
                if (error.response.status === 404) {
                    errorMessage = "Calendar not found. Please check your Calendar ID and ensure you've shared it with the service account.";
                    statusCode = 404;
                } else if (error.response.status === 403) {
                    errorMessage = "Access denied. The service account doesn't have permission to access this calendar.";
                    statusCode = 403;
                } else {
                    errorMessage = `Google API error: ${error.response.status} ${error.response.statusText}`;
                }

                console.error(`Google API error response: ${JSON.stringify(error.response.data)}`);
            }

            return NextResponse.json({
                success: false,
                events: [],
                error: errorMessage,
                details: error.message || "Unknown error"
            }, { status: statusCode });
        }
    } catch (error: any) {
        console.error("Unexpected error in calendar events endpoint:", error);
        return NextResponse.json(
            {
                success: false,
                events: [],
                error: "Failed to fetch calendar events",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
} 