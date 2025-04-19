import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
    try {
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
        const { prompt, calendarId } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        if (!calendarId) {
            return NextResponse.json(
                { error: "Calendar ID is required. Please connect your Google Calendar first." },
                { status: 400 }
            );
        }

        // Get the MCP server URL from environment variables
        const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3100';

        console.log(`Connecting to MCP server at: ${mcpServerUrl}`);
        console.log(`Sending prompt: "${prompt}" for calendar: ${calendarId}`);

        // Ensure the MCP server URL is properly formatted
        const baseUrl = mcpServerUrl.endsWith('/') ? mcpServerUrl.slice(0, -1) : mcpServerUrl;

        // First test if the MCP server is reachable
        try {
            console.log("Testing MCP server connectivity...");
            const testEndpoint = `${baseUrl}/api/test`;
            console.log(`Sending test request to: ${testEndpoint}`);

            const testResponse = await fetch(testEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ test: true }),
            });

            const testData = await testResponse.json();
            console.log("Test response data:", testData);

            if (!testResponse.ok) {
                throw new Error(`MCP test endpoint responded with status: ${testResponse.status}`);
            }

            console.log("MCP server test successful!");
        } catch (testError: unknown) {
            console.error("Error testing MCP server:", testError);
            return NextResponse.json(
                {
                    error: "Failed to connect to MCP server",
                    response: "Sorry, I couldn't process that request. The MCP server appears to be unavailable.",
                    details: testError instanceof Error ? testError.message : "Unknown error"
                },
                { status: 503 }
            );
        }

        // Now make the actual query request
        console.log("Making query request to MCP server...");
        const queryEndpoint = `${baseUrl}/api/calendar/query`;
        console.log(`Sending to endpoint: ${queryEndpoint}`);

        // Forward the request to the MCP server
        const mcpResponse = await fetch(queryEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt,
                calendarId
            }),
        });

        if (!mcpResponse.ok) {
            const errorText = await mcpResponse.text();
            console.error(`MCP server error (${mcpResponse.status}):`, errorText);
            throw new Error(`MCP server responded with status: ${mcpResponse.status} - ${errorText}`);
        }

        // Get the response from the MCP server
        const mcpData = await mcpResponse.json();
        console.log("MCP response received:", mcpData);

        // Return the response to the client
        return NextResponse.json(mcpData);
    } catch (error) {
        console.error("Error processing query:", error);
        return NextResponse.json(
            { error: "Failed to process query", response: "Sorry, I couldn't process that request. Please try again later." },
            { status: 500 }
        );
    }
} 