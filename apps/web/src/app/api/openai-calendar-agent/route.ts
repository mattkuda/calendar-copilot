import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
});

// MCP Server connection details
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3100';

// Fetch available tools from MCP server
async function fetchMCPTools() {
    try {
        const response = await fetch(`${MCP_SERVER_URL}/api/tools`);
        if (!response.ok) {
            throw new Error(`MCP server responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data.tools || [];
    } catch (error: any) {
        console.error('Error fetching MCP tools:', error);
        throw new Error(`Failed to fetch tools from MCP server: ${error.message}`);
    }
}

// Call a tool on the MCP server
async function callMCPTool(toolName: string, toolParams: any) {
    try {
        console.log(`Calling MCP tool: ${toolName} with params:`, toolParams);

        const response = await fetch(`${MCP_SERVER_URL}/api/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: toolName,
                input: toolParams
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP server tool execution failed (${response.status}): ${errorText}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error(`Error calling MCP tool ${toolName}:`, error);
        throw new Error(`Failed to execute tool ${toolName}: ${error.message}`);
    }
}

// Define OpenAI tool schemas based on MCP tools
function getMCPToolDefinitionsForOpenAI(mcpTools: any[]) {
    return mcpTools.map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: "object",
                properties: tool.name === "get-events-range"
                    ? {
                        startDate: {
                            type: "string",
                            description: "Start date in ISO format (YYYY-MM-DD) or natural language (e.g., 'today', 'tomorrow')"
                        },
                        endDate: {
                            type: "string",
                            description: "End date in ISO format (YYYY-MM-DD) or natural language (e.g., 'today', 'tomorrow')"
                        },
                        calendarId: {
                            type: "string",
                            description: "Google Calendar ID, defaults to primary calendar"
                        }
                    }
                    : {
                        title: {
                            type: "string",
                            description: "Title of the event"
                        },
                        datetime: {
                            type: "string",
                            description: "Start date and time of the event in ISO format or natural language"
                        },
                        duration: {
                            type: "number",
                            description: "Duration of the event in minutes"
                        },
                        attendees: {
                            type: "array",
                            items: {
                                type: "string"
                            },
                            description: "List of email addresses of attendees"
                        },
                        calendarId: {
                            type: "string",
                            description: "Google Calendar ID, defaults to primary calendar"
                        }
                    },
                required: tool.name === "get-events-range"
                    ? ["startDate", "endDate"]
                    : ["title", "datetime", "duration"]
            }
        }
    }));
}

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

        // 1. Fetch available tools from MCP server
        let mcpTools;
        try {
            mcpTools = await fetchMCPTools();
            console.log("Available MCP tools:", mcpTools);
        } catch (error: any) {
            console.error("Error connecting to MCP server:", error);
            return NextResponse.json(
                {
                    error: "Failed to connect to MCP server",
                    response: "Sorry, I couldn't process that request. The MCP server appears to be unavailable.",
                    details: error.message
                },
                { status: 503 }
            );
        }

        const currentDateAndTimeString = new Date().toISOString();

        // 2. Define the system message for OpenAI
        const systemMessage = {
            role: "system" as const,
            content: `You are Calendar Copilot, an AI assistant that helps  users query and manage their Google Calendar. 
            The user has connected their calendar with ID: ${calendarId}.
            Today's date is ${currentDateAndTimeString}.
            Use the provided tools to retrieve calendar events or create new ones based on the user's request.
            For dates and times, always consider the user's intent and use appropriate formats.
            If specifc details are missing, make reasonable assumptions.
            Always provide helpful, concise responses.`
        };

        // 3. Get the tool definitions for OpenAI based on MCP tools
        const toolDefinitions = getMCPToolDefinitionsForOpenAI(mcpTools);

        console.log("Open ai key: ", process.env.OPENAI_API_KEY)

        // 4. Initial OpenAI call with the user's prompt
        const initialResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                systemMessage,
                { role: "user" as const, content: prompt }
            ],
            tools: toolDefinitions,
            tool_choice: "auto",
        });

        const initialMessage = initialResponse.choices[0].message;
        console.log("Initial OpenAI response:", initialMessage);

        // If no tool calls, just return the text response
        if (!initialMessage.tool_calls || initialMessage.tool_calls.length === 0) {
            return NextResponse.json({
                response: initialMessage.content,
                intent: "unknown"
            });
        }

        // 5. Process tool calls and execute them on the MCP server
        const toolOutputs = [];
        for (const toolCall of initialMessage.tool_calls) {
            try {
                const toolName = toolCall.function.name;
                const toolParams = JSON.parse(toolCall.function.arguments);

                // Add calendarId to tool params if not provided
                if (!toolParams.calendarId) {
                    toolParams.calendarId = calendarId;
                }

                // Execute the tool on the MCP server
                const toolResult = await callMCPTool(toolName, toolParams);
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    role: "tool" as const,
                    name: toolName,
                    content: JSON.stringify(toolResult)
                });

                console.log(`Tool ${toolName} executed successfully:`, toolResult);
            } catch (error: any) {
                console.error(`Error executing tool ${toolCall.function.name}:`, error);
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    role: "tool" as const,
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: error.message })
                });
            }
        }

        // 6. Final OpenAI call with tool outputs to get the final response
        const finalResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                systemMessage,
                { role: "user" as const, content: prompt },
                initialMessage,
                ...toolOutputs
            ]
        });

        const finalMessage = finalResponse.choices[0].message;
        console.log("Final OpenAI response:", finalMessage);

        // Determine the intent from the tool calls
        let intent = "unknown";
        if (initialMessage.tool_calls && initialMessage.tool_calls.length > 0) {
            const toolName = initialMessage.tool_calls[0].function.name;
            intent = toolName === "get-events-range" ? "get_events" :
                toolName === "create-event" ? "create_event" : "unknown";
        }

        // Return the final response to the client
        return NextResponse.json({
            response: finalMessage.content,
            intent: intent
        });

    } catch (error: any) {
        console.error("Error processing request:", error);
        return NextResponse.json(
            {
                error: "Failed to process request",
                response: "Sorry, I couldn't process that request. Please try again later.",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
} 