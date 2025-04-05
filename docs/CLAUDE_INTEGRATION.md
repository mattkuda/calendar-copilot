# Claude for Desktop Integration Guide

This guide will walk you through the process of integrating Calendar Copilot with Claude for Desktop using MCP (Model Context Protocol).

## Prerequisites

- [Claude for Desktop](https://claude.ai/desktop) installed
- Calendar Copilot project set up and built
- Google Calendar connected via the web app

## Setting Up the MCP Server

The MCP server is available in two formats:

### JavaScript Version (Recommended)

1. Navigate to the MCP server directory:

   ```bash
   cd apps/mcp-server
   ```

2. No build step required, simply run:

   ```bash
   npm run dev
   ```

### TypeScript Version (Advanced)

1. Navigate to the MCP server directory:

   ```bash
   cd apps/mcp-server
   ```

2. Build the TypeScript server:

   ```bash
   npm run build
   ```

3. Run the server:

   ```bash
   npm start
   ```

## Configuring Claude for Desktop

Configure Claude for Desktop to use the Calendar Copilot MCP server:

1. Open the Claude configuration file at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. If the file doesn't exist, create it with the following content:

   For JavaScript version:
   ```json
   {
     "mcpServers": {
       "calendar-copilot": {
         "command": "node",
         "args": [
           "/ABSOLUTE/PATH/TO/calendar-copilot/apps/mcp-server/src/index.js"
         ]
       }
     }
   }
   ```

   For TypeScript version:
   ```json
   {
     "mcpServers": {
       "calendar-copilot": {
         "command": "node",
         "args": [
           "/ABSOLUTE/PATH/TO/calendar-copilot/apps/mcp-server/dist/index.js"
         ]
       }
     }
   }
   ```

   Replace `/ABSOLUTE/PATH/TO/` with the full path to your project.

3. Restart Claude for Desktop to load the new configuration.

## Using Calendar Copilot in Claude

After setting up the MCP server, you'll see a tools icon (hammer) in the Claude interface. This indicates that Claude has access to your Calendar Copilot tools.

### Example Prompts

Try asking Claude these questions:

- "What meetings do I have next week?"
- "What's on my calendar for tomorrow?"
- "Show me my schedule for Friday."
- "Schedule a 30-minute meeting with Joe on Thursday at 2 PM."
- "Create a 1-hour team meeting on Monday at 10 AM, and include sarah@example.com."

## Troubleshooting

### MCP Server Not Showing Up

If you don't see the tools icon in Claude:

1. Verify your `claude_desktop_config.json` file is correctly formatted.
2. Make sure the path to the MCP server is absolute and correct.
3. Check the Claude logs at `~/Library/Logs/Claude/mcp*.log` for errors.
4. Restart Claude for Desktop.

### Authentication Issues

If you see errors about authentication:

1. Make sure you've connected your Google Calendar in the web app.
2. Verify that the OAuth tokens are being properly passed to the MCP server.
3. Use the `/api/auth/set-tokens` endpoint to set your authentication tokens.

### TypeScript Errors

If you encounter TypeScript compilation errors:

1. Try using the JavaScript version of the server instead, which avoids TypeScript issues.
2. If you prefer TypeScript, ensure all dependencies are installed with `npm install`.

### Claude Not Using the Tools

If Claude isn't using the tools when expected:

1. Be more explicit in your prompt about wanting to use the calendar.
2. Make sure your request is clearly about calendar management.
3. Try rephrasing your question if Claude doesn't recognize it as a calendar-related task. 