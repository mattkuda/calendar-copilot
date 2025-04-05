# Calendar Copilot

An AI-powered calendar assistant that integrates with Claude for Desktop using MCP.

## Overview

Calendar Copilot allows users to:

- Connect their Google Calendar via OAuth2
- Query their calendar using natural language through Claude
- Create new calendar events using natural language instructions

## Project Structure

This monorepo contains:

- `apps/web`: Next.js frontend application with shadcn/ui components
- `apps/mcp-server`: Node.js CLI that provides MCP tools for Claude
- `packages/shared`: Shared utilities, types, and API functions

## Getting Started

### Prerequisites

- Node.js 18+
- Google Developer Account (for Calendar API access)
- Claude for Desktop with MCP

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the `apps/web` directory with:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXTAUTH_SECRET=random_string
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run the development servers:
   ```
   npm run dev
   ```

## MCP Integration

The MCP server exposes two main functions to Claude:

1. `get-events-range({ startDate, endDate })`: Retrieves calendar events within a date range
2. `create-event({ title, datetime, duration, attendees })`: Creates a new calendar event

## License

MIT 