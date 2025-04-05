# Calendar Copilot Web App

The frontend web application for Calendar Copilot, built with Next.js, Clerk for authentication, and Google Calendar integration.

## Authentication Setup

### 1. Clerk Setup

1. Create an account at [Clerk.com](https://clerk.com)
2. Create a new application in the Clerk dashboard
3. Get your API keys (Publishable Key and Secret Key)
4. Add them to your `.env.local` file:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
   CLERK_SECRET_KEY=your_secret_key
   ```

### 2. Google OAuth Setup

1. In your Clerk dashboard, go to "Social Connections"
2. Enable Google OAuth
3. Create a new project in the [Google Cloud Console](https://console.cloud.google.com/) if you don't have one
4. Enable the Google Calendar API for your project
5. Configure your OAuth consent screen
6. Create OAuth credentials (Web application type)
7. Add the Clerk callback URL as an authorized redirect URI
8. Copy your Google Client ID and Client Secret to your Clerk dashboard

## Running the Application

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## MCP Server Integration

The web app connects to the MCP server running on port 3100. Make sure to start the MCP server before using the calendar integration features:

```
cd ../mcp-server
npm run dev
```

## Features

- User authentication with Clerk
- Google Calendar integration
- Dashboard to view upcoming events
- Integration with Claude for Desktop via MCP

## Project Structure

- `app/`: Next.js App Router components and pages
- `components/`: Reusable UI components
- `types/`: TypeScript type definitions
- `lib/`: Utility functions and shared logic
- `public/`: Static assets

## API Routes

- `api/auth/[...nextauth]`: NextAuth.js implementation for Google OAuth
- `api/calendar/events`: Get calendar events
- `api/calendar/create`: Create a new calendar event 