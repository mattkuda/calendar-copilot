# Calendar Copilot MCP Server

This directory contains a simple Express server that acts as a bridge between Claude and Google Calendar.

## Setup Options

The server is provided in two formats:

1. **JavaScript Version** (Recommended): `src/index.js`
   - Simpler setup with fewer dependencies
   - No TypeScript compilation needed
   - Run with `npm run dev` or `npm start`

2. **TypeScript Version**: `src/index.ts` 
   - Type-safe development
   - Requires compilation before running
   - More complex setup but better for long-term development

## Running the Server

### JavaScript Version (Recommended)

```bash
# From the mcp-server directory
npm run dev
```

### TypeScript Version

If you prefer to use the TypeScript version, you need to modify the package.json scripts:

1. Update package.json to use TypeScript:
```json
"scripts": {
  "dev": "ts-node src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```

2. Then run:
```bash
npm run build
npm run dev
```

## Environment Variables

Create a `.env` file in the `apps/mcp-server` directory with:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:3000/api/auth/callback/google
PORT=3100
```

## API Endpoints

- **GET /api/calendar/events**: Retrieve calendar events
  - Query params: `startDate`, `endDate`

- **POST /api/calendar/create**: Create a new calendar event
  - Body: `title`, `datetime`, `duration`, and optional `attendees`

- **POST /api/auth/set-tokens**: Set the OAuth tokens
  - Body: `accessTokenNew`, `refreshTokenNew`

## Notes

The server must be authenticated with Google Calendar before it can fetch or create events. Use the `/api/auth/set-tokens` endpoint to set the required OAuth tokens. 