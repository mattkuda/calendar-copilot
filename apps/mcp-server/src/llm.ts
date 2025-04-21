import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables explicitly here as well
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;
console.log("OpenAI API Key available:", !!apiKey);
if (!apiKey) {
    console.error("OPENAI_API_KEY is missing or empty in environment variables");
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: apiKey || "", // Use empty string as fallback to make TypeScript happy
});

// Define schemas for different calendar intents
const GetCalendarEventsSchema = z.object({
    intent: z.literal('get_events'),
    timeRange: z.object({
        startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD) or natural language (today, tomorrow, etc.). Must be a full date."),
        endDate: z.string().describe("End date in ISO format (YYYY-MM-DD) or natural language. Must be a full date.")
    }),
    description: z.string().describe("A description of what the user is asking for")
});

const CreateCalendarEventSchema = z.object({
    intent: z.literal('create_event'),
    eventDetails: z.object({
        title: z.string().describe("The title of the event"),
        datetime: z.string().describe("The full start date and time of the event in ISO format (YYYY-MM-DDTHH:MM:SS). If the user only specifies a time, assume the date is today."),
        duration: z.number().describe("Duration of the event in minutes"),
        attendees: z.array(z.string()).nullable().describe("Email addresses of attendees")
    }),
    description: z.string().describe("A description of the event the user wants to create")
});

const UnknownIntentSchema = z.object({
    intent: z.literal('unknown'),
    description: z.string().describe("A description of what the user might be asking for")
});

// Combined schema for all possible intents
const CalendarIntentSchema = z.discriminatedUnion('intent', [
    GetCalendarEventsSchema,
    CreateCalendarEventSchema,
    UnknownIntentSchema
]);

// Export the type derived from the schema
export type CalendarIntent = z.infer<typeof CalendarIntentSchema>;

/**
 * Process a natural language prompt with OpenAI to determine calendar intent
 * @param prompt User's natural language query
 * @returns Structured intent data for calendar operations
 */
export async function processCalendarPrompt(prompt: string) {
    try {
        console.log("Processing prompt with OpenAI:", prompt);

        // Define the response schema directly with Zod
        const ResponseSchema = z.object({
            intent: z.enum(['get_events', 'create_event', 'unknown']).describe("The type of calendar action the user wants to perform"),
            timeRange: z.object({
                startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD). If user says 'today', use today's date."),
                endDate: z.string().describe("End date in ISO format (YYYY-MM-DD). If user says 'tomorrow', use tomorrow's date.")
            }).describe("Time range for calendar query, required if intent is get_events."),
            eventDetails: z.object({
                title: z.string().describe("The title of the event"),
                datetime: z.string().describe("The full start date and time in ISO format (YYYY-MM-DDTHH:MM:SS). **Crucially, if the user provides only a time (e.g., '8pm'), assume the date is *today* and return the full ISO datetime string.**"),
                duration: z.number().describe("Duration in minutes (e.g., '1 hour' becomes 60)"),
                attendees: z.array(z.string()).nullable().describe("Email addresses of attendees, if mentioned")
            }).describe("Details for event creation, required if intent is create_event."),
            description: z.string().describe("Description of what the user is asking for")
        });

        var currentDate = new Date();
        var currentDateString = currentDate.toISOString();

        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a calendar assistant that helps users query and manage their calendar events.
Your task is to understand what the user is asking for and extract structured information based on the provided JSON schema.

Today's date is ${currentDateString}.
When the user asks about their calendar or schedule, determine if they want to:
1. View existing events ('get_events'): Extract the date range (startDate, endDate). Use ISO format YYYY-MM-DD. Default to today if only one day is mentioned (e.g., "what's on my calendar today?").
2. Create a new event ('create_event'): Extract the title, full datetime, duration (in minutes), and attendees.
   - **IMPORTANT**: For the 'datetime' field, ALWAYS return a full ISO datetime string (YYYY-MM-DDTHH:MM:SS). If the user only specifies a time (e.g., "at 3pm", "8-9pm"), you MUST assume the date is **today** and construct the full ISO string accordingly. Do not return just the time component.
   - Convert durations like "1 hour" or "30 minutes" into total minutes.

If the user's request is unclear or doesn't fit these intents, use 'unknown'. Provide a helpful description in all cases.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: zodResponseFormat(ResponseSchema, "calendarIntent"),
            temperature: 0.1,
        });

        console.log("OpenAI processed response:", JSON.stringify(response.choices[0].message.parsed, null, 2));

        // Create a properly structured result based on the intent
        let result: CalendarIntent;
        const parsedResponse = response.choices[0].message.parsed;

        // Default fallback for unknown intent
        if (!parsedResponse) {
            result = {
                intent: 'unknown',
                description: 'Failed to parse response from AI'
            };
        } else if (parsedResponse.intent === 'get_events' && parsedResponse.timeRange) {
            result = {
                intent: 'get_events',
                timeRange: {
                    startDate: parsedResponse.timeRange.startDate,
                    endDate: parsedResponse.timeRange.endDate
                },
                description: parsedResponse.description
            };
        } else if (parsedResponse.intent === 'create_event' && parsedResponse.eventDetails) {
            // Ensure datetime is correctly formatted (basic check)
            if (!parsedResponse.eventDetails.datetime || !parsedResponse.eventDetails.datetime.includes('T')) {
                console.warn("OpenAI response for datetime might be incorrect:", parsedResponse.eventDetails.datetime);
                // Potentially throw error or attempt correction here if needed
            }
            result = {
                intent: 'create_event',
                eventDetails: {
                    title: parsedResponse.eventDetails.title,
                    datetime: parsedResponse.eventDetails.datetime, // Trusting OpenAI provides full ISO now
                    duration: parsedResponse.eventDetails.duration,
                    attendees: parsedResponse.eventDetails.attendees || []
                },
                description: parsedResponse.description
            };
        } else {
            result = {
                intent: 'unknown',
                description: parsedResponse.description || 'Unknown request'
            };
        }

        return result;
    } catch (error) {
        console.error("Error processing calendar prompt with OpenAI:", error);
        // Check if it's an OpenAI specific error
        if (error instanceof OpenAI.APIError) {
            console.error("OpenAI API Error Details:", { status: error.status, message: error.message, code: error.code, type: error.type });
            throw new Error(`OpenAI API Error (${error.status}): ${error.message}`);
        }
        throw new Error("Failed to process calendar intent");
    }
}

/**
 * Generate a human-friendly response for calendar operations
 * @param events List of calendar events
 * @param prompt Original user prompt
 * @param startDate Start date of query range
 * @param endDate End date of query range
 * @returns Human-friendly response text
 */
export async function generateCalendarQueryResponse(events: any[], prompt: string, startDate: string, endDate: string) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful calendar assistant. Generate a natural, conversational response about the user's calendar based on the events data provided. Be concise but friendly."
                },
                {
                    role: "user",
                    content: `User asked: "${prompt}"
                    
Date range: ${startDate} to ${endDate}

Calendar events (${events.length} total):
${JSON.stringify(events, null, 2)}

Please provide a natural, conversational response summarizing these events. If there are no events, mention that. Include key details like event titles, times, and dates in a readable format.`
                }
            ],
            temperature: 0.7,
            max_tokens: 350
        });

        return response.choices[0].message.content || "I've checked your calendar.";
    } catch (error) {
        console.error("Error generating calendar response:", error);
        // Fallback to simple response if OpenAI fails
        return events.length === 0
            ? `You don't have any events scheduled in the specified time period.`
            : `You have ${events.length} event(s) scheduled in the specified time period.`;
    }
}

/**
 * Generate a human-friendly response for event creation
 * @param eventDetails Created event details
 * @param prompt Original user prompt
 * @returns Human-friendly response text
 */
export async function generateEventCreationResponse(eventDetails: any, prompt: string) {
    try {
        // Safely format dates, handle potential errors
        let startTimeStr = "N/A";
        let endTimeStr = "N/A";
        try {
            startTimeStr = new Date(eventDetails.start.dateTime).toLocaleString();
        } catch (e) { console.error("Error formatting start time:", e); }
        try {
            endTimeStr = new Date(eventDetails.end.dateTime).toLocaleString();
        } catch (e) { console.error("Error formatting end time:", e); }

        let attendeesStr = "";
        if (eventDetails.attendees && eventDetails.attendees.length > 0) {
            attendeesStr = `Attendees: ${eventDetails.attendees.map((a: any) => a.email).join(', ')}`;
        }

        const userContent = `User requested: "${prompt}"

Created event details:
Summary: ${eventDetails.summary || 'N/A'}
Starts: ${startTimeStr}
Ends: ${endTimeStr}
${attendeesStr}

Please provide a natural, conversational response confirming the event creation based *only* on the details provided above. Mention the title, date, and time.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful calendar assistant. Generate a natural, conversational response confirming an event has been created. Be concise but friendly."
                },
                {
                    role: "user",
                    content: userContent
                }
            ],
            temperature: 0.7,
            max_tokens: 200
        });

        return response.choices[0].message.content || "Your event has been created.";
    } catch (error) {
        console.error("Error generating event creation response:", error);
        if (error instanceof OpenAI.APIError) {
            console.error("OpenAI API Error Details:", { status: error.status, message: error.message, code: error.code, type: error.type });
        }
        // Fallback to simple response if OpenAI fails
        let fallbackResponse = `I've created a new event "${eventDetails.summary || 'event'}"`;
        try {
            fallbackResponse += ` for ${new Date(eventDetails.start.dateTime).toLocaleString()}`;
        } catch { /* Ignore if date parsing fails here */ }
        fallbackResponse += ".";
        return fallbackResponse;
    }
} 