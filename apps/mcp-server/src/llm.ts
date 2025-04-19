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
        startDate: z.string().describe("Start date in ISO format or natural language (today, tomorrow, etc.)"),
        endDate: z.string().describe("End date in ISO format or natural language")
    }),
    description: z.string().describe("A description of what the user is asking for")
});

const CreateCalendarEventSchema = z.object({
    intent: z.literal('create_event'),
    eventDetails: z.object({
        title: z.string().describe("The title of the event"),
        datetime: z.string().describe("When the event should start in ISO format or natural language"),
        duration: z.number().describe("Duration of the event in minutes"),
        attendees: z.array(z.string()).optional().describe("Email addresses of attendees")
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

        const response = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a calendar assistant that helps users query and manage their calendar events.
Your task is to understand what the user is asking for and extract structured information.

When the user asks about their calendar or schedule, determine if they want to:
1. View existing events (get_events)
2. Create a new event (create_event)

Extract the relevant details like dates, times, event titles, durations, and attendees.
For dates and times, prefer ISO format where possible, but can use natural language (today, tomorrow, etc.).
For durations, convert to minutes (e.g., 1 hour = 60 minutes).
If the intent is unclear, return 'unknown' as the intent.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: zodResponseFormat(CalendarIntentSchema, "calendar_intent"),
            temperature: 0.1
        });

        // Extract the parsed content
        const result = response.choices[0].message.parsed;
        console.log("OpenAI processed intent:", JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error("Error processing calendar prompt with OpenAI:", error);
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

        return response.choices[0].message.content;
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
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful calendar assistant. Generate a natural, conversational response confirming an event has been created. Be concise but friendly."
                },
                {
                    role: "user",
                    content: `User requested: "${prompt}"
                    
Created event details:
${JSON.stringify(eventDetails, null, 2)}

Please provide a natural, conversational response confirming the event creation with key details like the event title, time, date, duration, and any attendees in a readable format.`
                }
            ],
            temperature: 0.7,
            max_tokens: 200
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error("Error generating event creation response:", error);
        // Fallback to simple response if OpenAI fails
        return `I've created a new event "${eventDetails.summary}" for ${new Date(eventDetails.start.dateTime).toLocaleString()}.`;
    }
} 