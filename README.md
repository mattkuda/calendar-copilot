# Calendar Copilot

An AI-powered calendar assistant that integrates with Claude for Desktop using the Model Context Protocol (MCP).

## Overview

Calendar Copilot is a demonstration of the Model Context Protocol (MCP) integration pattern, allowing users to:

- Connect their Google Calendar via OAuth2
- Query their calendar using natural language through the web UI (using OpenAI)
- Create new calendar events using natural language instructions
- Connect directly to the MCP server from Claude for Desktop

## Architecture

This project follows the Model Context Protocol pattern with three main components:

1. **MCP Server** (`apps/mcp-server`): A standalone Node.js server that:
   - Implements the MCP protocol to expose calendar tools
   - Provides two primary tools: `get-events-range` and `create-event`
   - Handles Google Calendar API operations without any LLM logic
   - Can be accessed by Claude for Desktop via MCP protocol

2. **Next.js App** (`apps/web`): A full-stack web application that:
   - Provides a user interface for interacting with the calendar
   - Includes an API route (`/api/openai-calendar-agent`) that acts as an MCP client
   - Orchestrates OpenAI's interaction with the MCP server
   - Manages user authentication via Clerk

3. **Shared Library** (`packages/shared`): Common code including:
   - Type definitions
   - Schema validations
   - Utility functions

## Project Structure

This monorepo contains:

- `apps/web`: Next.js frontend application with shadcn/ui components
- `apps/mcp-server`: Node.js CLI that provides MCP tools for Claude
- `packages/shared`: Shared utilities, types, and API functions

## Google Calendar Integration

### Development Mode

In development, the application includes a fallback to mock data if Google Calendar integration is not properly configured. This allows for easier testing without requiring a full Google setup.

### Production Mode

For production use, you'll need to configure Google Calendar integration:

1. Set up a Google Cloud project with Calendar API enabled
2. Create a service account for server-side operations
3. Configure OAuth credentials for user-based authentication (optional)
4. Share calendars with the service account

### Setup Steps

1. **Create a Google Cloud Project**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Calendar API in "APIs & Services" > "Library"

2. **Set Up Service Account for Calendar Access**
   - Go to "IAM & Admin" > "Service Accounts" and create a new service account
   - Give it a descriptive name (e.g., "Calendar Copilot Service")
   - Create a JSON key for the service account
   - Download the key file

3. **Configure Environment Variables**
   - Copy the `.env.example` files to `.env` in the respective directories
   - Fill in the service account credentials

4. **Share Calendars with the Service Account**
   - Have users go to [Google Calendar](https://calendar.google.com/)
   - Open settings for the relevant calendar
   - Share with the service account email address
   - Set appropriate permissions (at least "Make changes to events")

## MCP Integration with Claude

The MCP server exposes two main tools to Claude:

1. `get-events-range({ startDate, endDate })`: Retrieves calendar events within a date range
2. `create-event({ title, datetime, duration, attendees })`: Creates a new calendar event

To connect Claude to the MCP server:

1. Start the MCP server: `cd apps/mcp-server && npm run dev`
2. In Claude for Desktop, set up a connection to `http://localhost:3100/api/manifest`
3. You can then use natural language to interact with your calendar

## Getting Started

### Prerequisites

- Node.js 18+
- Google Developer Account with Calendar API enabled
- Claude for Desktop with MCP (for direct Claude integration)
- OpenAI API key (for web UI integration)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Install additional dependencies in the web app:
   ```
   cd apps/web && npm install openai
   ```

4. Run the development servers:
   ```
   npm run dev
   ```

## License

MIT 