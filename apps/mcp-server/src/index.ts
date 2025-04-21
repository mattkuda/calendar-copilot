#!/usr/bin/env node
import * as dotenv from 'dotenv';
import express, { Request, Response, Router, RequestHandler } from 'express';
import path from 'path';
import cors from 'cors';
import { z } from 'zod';
import { executeGetEventsRange, executeCreateEvent } from './googleCalendar';

// Load .env files
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.WEB_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Router for API routes
const router = Router();

// Tool schemas - following the MCP protocol specifications
const getEventsRangeParamsSchema = z.object({
    startDate: z.string().describe('Start date in ISO format (YYYY-MM-DD) or natural language (e.g., "today", "tomorrow")'),
    endDate: z.string().describe('End date in ISO format (YYYY-MM-DD) or natural language (e.g., "today", "tomorrow")'),
    calendarId: z.string().optional().describe('Google Calendar ID, defaults to primary calendar')
});

const createEventParamsSchema = z.object({
    title: z.string().describe('Title of the event'),
    datetime: z.string().describe('Start date and time of the event in ISO format or natural language'),
    duration: z.number().describe('Duration of the event in minutes'),
    attendees: z.array(z.string()).optional().describe('List of email addresses of attendees'),
    calendarId: z.string().optional().describe('Google Calendar ID, defaults to primary calendar')
});

// MCP Manifest schema
const mcpManifest = {
    schemaVersion: '1.0',
    name: 'calendar-copilot',
    description: 'Google Calendar tools for event management',
    contact: {
        name: 'Calendar Copilot'
    },
    auth: {
        type: 'none' // Since the server handles authentication internally
    },
    tools: [
        {
            name: 'get-events-range',
            description: 'Retrieves calendar events within a specified date range',
            inputSchema: getEventsRangeParamsSchema,
            examples: [
                {
                    input: {
                        startDate: 'today',
                        endDate: 'tomorrow'
                    },
                    output: {
                        events: [
                            {
                                summary: 'Team Meeting',
                                start: { dateTime: '2023-04-25T10:00:00Z' },
                                end: { dateTime: '2023-04-25T11:00:00Z' }
                            }
                        ]
                    }
                }
            ]
        },
        {
            name: 'create-event',
            description: 'Creates a new calendar event',
            inputSchema: createEventParamsSchema,
            examples: [
                {
                    input: {
                        title: 'Coffee with Alice',
                        datetime: '2023-04-26T15:00:00',
                        duration: 30,
                        attendees: ['alice@example.com']
                    },
                    output: {
                        success: true,
                        event: {
                            summary: 'Coffee with Alice',
                            start: { dateTime: '2023-04-26T15:00:00Z' },
                            end: { dateTime: '2023-04-26T15:30:00Z' },
                            attendees: [{ email: 'alice@example.com' }]
                        }
                    }
                }
            ]
        }
    ]
};

// MCP Protocol handlers
// 1. Get manifest
const getManifestHandler: RequestHandler = (req, res) => {
    res.json(mcpManifest);
};

// 2. Tool execution handler
interface MCPRequest {
    name: string;
    input: any;
}

// Handle get-events-range tool
const getEventsRangeHandler = async (input: any) => {
    try {
        // Validate input
        const { startDate, endDate, calendarId = 'primary' } = getEventsRangeParamsSchema.parse(input);

        // Execute the calendar function
        const events = await executeGetEventsRange(startDate, endDate, calendarId);

        // Return formatted response
        return {
            events
        };
    } catch (error: any) {
        console.error('[MCP:get-events-range] Error:', error);
        throw new Error(`Failed to get events: ${error.message}`);
    }
};

// Handle create-event tool
const createEventHandler = async (input: any) => {
    try {
        // Validate input
        const { title, datetime, duration, attendees = [], calendarId = 'primary' } = createEventParamsSchema.parse(input);

        // Execute the calendar function
        const event = await executeCreateEvent(title, datetime, duration, attendees, calendarId);

        // Return formatted response
        return {
            success: true,
            event
        };
    } catch (error: any) {
        console.error('[MCP:create-event] Error:', error);
        throw new Error(`Failed to create event: ${error.message}`);
    }
};

// Main tool execution endpoint for MCP
const executeToolHandler: RequestHandler = async (req, res) => {
    try {
        const mcpRequest = req.body as MCPRequest;

        if (!mcpRequest.name) {
            return res.status(400).json({
                error: 'Invalid request: tool name is required'
            });
        }

        console.log(`[MCP] Executing tool: ${mcpRequest.name}`);

        let result;

        // Route to the appropriate tool implementation
        switch (mcpRequest.name) {
            case 'get-events-range':
                result = await getEventsRangeHandler(mcpRequest.input);
                break;

            case 'create-event':
                result = await createEventHandler(mcpRequest.input);
                break;

            default:
                return res.status(400).json({
                    error: `Unknown tool: ${mcpRequest.name}`
                });
        }

        // Return the result
        return res.json(result);

    } catch (error: any) {
        console.error('[MCP:execute] Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};

// List available tools endpoint (simplified version of manifest)
const listToolsHandler: RequestHandler = (req, res) => {
    const tools = mcpManifest.tools.map(tool => ({
        name: tool.name,
        description: tool.description
    }));

    res.json({ tools });
};

// Test endpoint for connectivity checks
const testHandler: RequestHandler = (req, res) => {
    res.json({
        success: true,
        message: "Calendar Copilot MCP Server is running",
        tools: mcpManifest.tools.map(t => t.name)
    });
};

// Register MCP Protocol routes
router.get('/manifest', getManifestHandler);
router.post('/execute', executeToolHandler);
router.get('/tools', listToolsHandler);
router.get('/test', testHandler);
router.post('/test', testHandler);

// Register router with prefix
app.use('/api', router);

// Add a default 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// Add global error handler middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
    console.error('[Global Error] Caught:', err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        error: err.message || 'Internal server error',
    });
});

// Start server
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`🚀 Calendar Copilot MCP Server running on port ${PORT}`);
    console.log(`📄 MCP Manifest available at http://localhost:${PORT}/api/manifest`);
    console.log(`🔧 MCP Tools available at http://localhost:${PORT}/api/tools`);

    console.log('\n🧩 Exposed MCP Tools:');
    mcpManifest.tools.forEach(tool => {
        console.log(`- ${tool.name}: ${tool.description}`);
    });

    // Log environment configuration
    console.log('\n⚙️ Environment:');
    console.log(`- MOCK_MODE: ${process.env.MOCK_MODE === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`- Service Account: ${!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'Configured' : 'Not configured'}`);
}); 