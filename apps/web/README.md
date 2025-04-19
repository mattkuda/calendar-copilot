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

## Google Calendar Integration

### Service Account Authentication (Recommended)

The app is designed to work with a Google Service Account for Calendar API integration. This allows the app to access and modify calendars on behalf of users who have explicitly shared their calendars with the service account.

#### Setting Up Service Account

1. Follow the instructions in the root README to create a Google Cloud project and service account
2. Ensure your service account has a JSON key generated
3. Add the service account details to your environment variables:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here...\n-----END PRIVATE KEY-----\n"
   ```

#### Important Notes About Service Accounts

- Service accounts operate independently of user authentication
- Each user must manually share their calendar with the service account
- The calendar ID (typically user's email address) must be provided by the user

### Sharing Calendars with the Service Account

Instruct your users to:

1. Go to [Google Calendar](https://calendar.google.com/)
2. Click the three dots next to the calendar they want to share
3. Select "Settings and sharing"
4. Scroll down to "Share with specific people or groups"
5. Click "Add people" and enter the service account email
6. Give "Make changes to events" permission (or higher)
7. Click "Send"

After sharing, users should enter their Calendar ID (typically their email address) in the dashboard.

### OAuth Authentication (Alternative)

If you prefer user-based OAuth authentication instead of a service account:

1. Create OAuth credentials in Google Cloud Console
2. Configure the OAuth consent screen with appropriate scopes
3. Add the credentials to your environment variables:
   ```
   GOOGLE_CLIENT_ID=your_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_oauth_client_secret
   ```
4. Update the backend code to use these credentials for authentication

## Running the Application

1. Ensure you have all required environment variables set
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing Calendar Integration

To verify your Calendar integration is working correctly:

1. Sign in to the application
2. Navigate to the dashboard
3. Enter your Calendar ID (either "primary" or your email address)
4. Try creating a new event with:
   - Title
   - Date and time
   - Duration
   - Optional attendees
5. Check your Google Calendar to confirm the event was created
6. View upcoming events to verify the calendar events fetch is working

## Troubleshooting

### Common Google Calendar API Errors

- **404 Not Found**: Calendar ID is incorrect or calendar isn't shared with service account
- **403 Forbidden**: Service account doesn't have proper permissions
- **401 Unauthorized**: Authentication failed or credentials are invalid

### Environment Variable Issues

If you're seeing authentication errors:

1. Verify your service account private key is formatted correctly with newlines (`\n`)
2. Make sure the key is enclosed in quotes in the .env file
3. Check that you've enabled the Google Calendar API in your Google Cloud project

## API Endpoints

- `api/calendar/events`: Fetch calendar events for a specified date range
- `api/calendar/create`: Create a new calendar event

## MCP Server Integration

The web app connects to the MCP server running on port 3100. Make sure to start the MCP server before using the calendar integration features:

```
cd ../mcp-server
npm run dev
```

## Features

- User authentication with Clerk
- Simulated Google Calendar integration with mock data
- Dashboard to view upcoming events (using mock data)
- Integration with Claude for Desktop via MCP

## Project Structure

- `app/`: Next.js App Router components and pages
- `components/`: Reusable UI components
- `types/`: TypeScript type definitions
- `lib/`: Utility functions and shared logic
- `public/`: Static assets

## API Routes

- `api/calendar/events`: Simulated Google Calendar events endpoint
- `api/calendar/create`: Simulated calendar event creation endpoint 