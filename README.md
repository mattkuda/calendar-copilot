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

## Google Calendar Integration Setup

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the Google Calendar API in "APIs & Services" > "Library"

### Step 2: Set Up Service Account for Calendar Access

1. Go to "IAM & Admin" > "Service Accounts" and create a new service account
2. Give it a descriptive name (e.g., "Calendar Copilot Service")
3. Skip role assignment (or assign minimal roles if needed)
4. Create a JSON key for the service account:
   - Click on the service account
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select JSON format
   - Download the key file

### Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env` in the root directory:
   ```
   cp .env.example .env
   ```

2. Fill in the service account credentials:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here...\n-----END PRIVATE KEY-----\n"
   ```
   
   Note: Make sure to preserve newlines with `\n` in the private key

3. (Optional) Set up OAuth credentials if you want user-based authentication:
   - Create OAuth consent screen in Google Cloud Console
   - Create OAuth client ID (Web application type)
   - Add authorized redirect URIs for your application
   - Set the credentials in .env:
     ```
     GOOGLE_CLIENT_ID=your-oauth-client-id
     GOOGLE_CLIENT_SECRET=your-oauth-client-secret
     ```

### Step 4: Share Calendars with the Service Account

To access user calendars, each user needs to share their calendar with the service account:

1. Have users go to [Google Calendar](https://calendar.google.com/)
2. Open settings for the relevant calendar ("Settings and sharing")
3. Go to "Share with specific people or groups"
4. Add the service account email address
5. Set appropriate permissions (at least "Make changes to events")

## Getting Started

### Prerequisites

- Node.js 18+
- Google Developer Account with Calendar API enabled
- Claude for Desktop with MCP

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

3. Run the development servers:
   ```
   npm run dev
   ```

## MCP Integration

The MCP server exposes two main functions to Claude:

1. `get-events-range({ startDate, endDate })`: Retrieves calendar events within a date range
2. `create-event({ title, datetime, duration, attendees })`: Creates a new calendar event

For detailed MCP setup instructions, see [docs/CLAUDE_INTEGRATION.md](docs/CLAUDE_INTEGRATION.md).

## License

MIT 