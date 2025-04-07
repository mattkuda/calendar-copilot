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

### 2. Route Protection

The application uses Clerk middleware to protect routes:
- Public routes: Homepage, sign-in, and sign-up pages
- Protected routes: Dashboard and any other authenticated pages
- API routes: Protected based on authentication state

The middleware automatically:
- Redirects authenticated users from public pages to the dashboard
- Redirects unauthenticated users from protected pages to the sign-in page
- Allows API requests to proceed, with individual API routes handling their own authorization

### 3. Google Calendar Integration

The app supports two modes for calendar integration:

#### Development Mode 
When Google OAuth is not configured, the app operates with mock data:
- Authentication works through Clerk's standard session tokens
- Calendar events are simulated with mock data
- Event creation is demonstrated with fake responses

#### Production Mode
For integration with real Google Calendar:

1. In your Clerk dashboard, go to "Social Connections"
2. Enable Google OAuth integration
3. Add required scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
4. Configure OAuth settings in Google Cloud Console:
   - Create a project with Calendar API access
   - Configure OAuth 2.0 consent screen
   - Create credentials and add Clerk's callback URL
5. The app automatically detects when a user has authorized with Google and will:
   - Attempt to use the Google OAuth token for API calls
   - Pass this token to backend API endpoints
   - Make real calls to the Google Calendar API

The app has built-in fallback mechanisms that will gracefully degrade to mock data if OAuth is not properly configured or if token access fails.

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