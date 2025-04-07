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
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Mock response for now
        const mockResponse = {
            response: `I processed your request: "${prompt}"\n\nThis is a simulated response for development. In production, this would connect to the MCP server to get a real response.`
        };

        return NextResponse.json(mockResponse);

        /* 
        // UNCOMMENT THIS SECTION WHEN MCP SERVER IS READY
        
        // Get the MCP server URL from environment variables
        const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;

        if (!mcpServerUrl) {
            return NextResponse.json(
                { error: "MCP server URL is not configured" },
                { status: 500 }
            );
        }

        // Forward the request to the MCP server
        const mcpResponse = await fetch(`${mcpServerUrl}/api/calendar/query`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt }),
        });

        if (!mcpResponse.ok) {
            throw new Error(`MCP server responded with status: ${mcpResponse.status}`);
        }

        // Get the response from the MCP server
        const mcpData = await mcpResponse.json();

        // Return the response to the client
        return NextResponse.json(mcpData);
        */
    } catch (error) {
        console.error("Error processing query:", error);
        return NextResponse.json(
            { error: "Failed to process query", response: "Sorry, I couldn't process that request. Please try again later." },
            { status: 500 }
        );
    }
} 