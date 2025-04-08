import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function currentUserOauthAccessToken() {
    const user = await currentUser();
    if (!user) {
        console.error("User not found");
        return null;
    }

    try {
        const clerkClient2 = await clerkClient();
        if (!clerkClient2) {
            console.error("Clerk client not found");
            return;
        }

        const tokens = await clerkClient2.users.getUserOauthAccessToken(user.id, 'oauth_google');

        console.log("Tokens", tokens);
        if (tokens && tokens.data && tokens.data.length > 0) {
            // Return just the token string, not the whole object
            return tokens.data[0].token;
        }
        return null;
    } catch (error) {
        console.error("Error getting OAuth token:", error);
        return null;
    }
}


export async function GET(request: Request) {
    try {
        console.log("Fetching calendar events");

        // Verify the user is authenticated with Clerk
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. User not authenticated." },
                { status: 401 }
            );
        }

        // Parse query parameters
        const url = new URL(request.url);
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        // Get the Google OAuth token for this user
        const googleToken = await currentUserOauthAccessToken();
        console.log("Received Google token:", googleToken ? "Token received" : "No token found");

        // Try to use the token directly with Google APIs
        if (googleToken) {
            try {
                // Create an OAuth2 client with the token
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: googleToken });

                const calendar = google.calendar({
                    version: "v3",
                    auth: oauth2Client
                });

                // Get events from Google Calendar
                const response = await calendar.events.list({
                    calendarId: "primary",
                    timeMin: new Date(startDate).toISOString(),
                    timeMax: new Date(endDate).toISOString(),
                    singleEvents: true,
                    orderBy: "startTime",
                    maxResults: 10
                });

                console.log("Successfully fetched Google Calendar events");
                return NextResponse.json({ events: response.data.items });
            } catch (error) {
                console.error("Error with Google Calendar API:", error);
            }
        } else {
            console.log("No Google OAuth token available - using mock data");
        }

        // For development, fall back to mock data if OAuth is not set up or fails
        console.log("Falling back to mock data");
        const mockEvents = [
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
            },
            {
                id: "3",
                summary: "Client Meeting",
                start: {
                    dateTime: new Date(new Date().getTime() + 48 * 3600000).toISOString(),
                },
                end: {
                    dateTime: new Date(new Date().getTime() + 48 * 3600000 + 45 * 60000).toISOString(),
                },
                attendees: [
                    { email: "client@examplecorp.com" }
                ]
            }
        ];

        return NextResponse.json({
            events: mockEvents,
            mockData: true,
            error: "Using mock data. This could be because Google OAuth is not set up or the token is invalid.",
            message: "To use real Google Calendar data, make sure you've configured Google OAuth in Clerk and granted the necessary Calendar scopes."
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar events" },
            { status: 500 }
        );
    }
} 