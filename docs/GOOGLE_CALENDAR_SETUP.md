# Google Calendar Integration Setup Guide

This guide provides detailed steps for setting up Google Calendar integration for Calendar Copilot.

## Prerequisites

- Google account with administrative access
- A project on Google Cloud Platform (new or existing)
- Basic familiarity with environment variables

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Calendar Copilot")
5. Click "Create"

## Step 2: Enable the Google Calendar API

1. In your project, go to "APIs & Services" > "Library" in the left navigation
2. Search for "Google Calendar API"
3. Select "Google Calendar API" from the results
4. Click "Enable"

## Step 3: Create a Service Account

A service account acts as a non-human user that can access Google Calendar on behalf of your application.

1. Navigate to "IAM & Admin" > "Service Accounts" in the left navigation
2. Click "Create Service Account"
3. Enter a service account name (e.g., "calendar-copilot-service")
4. (Optional) Add a description
5. Click "Create and Continue"
6. For the role, you can skip this step by clicking "Continue"
7. For grant users access, you can skip this step by clicking "Done"

## Step 4: Create and Download Service Account Key

1. From the Service Accounts list, click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" as the key type
5. Click "Create"
6. A JSON key file will be downloaded to your computer - keep this secure!

## Step 5: Configure Environment Variables

1. Extract the service account email and private key from the downloaded JSON file
2. Open your project's `.env` file (or create `.env.local` in apps/web/)
3. Add the following environment variables:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here...\n-----END PRIVATE KEY-----\n"
```

**Important notes about the private key:**
- Copy the entire private key from the JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts
- Replace all newlines with `\n` characters
- Enclose the entire key in double quotes

Example of formatting the private key:
```json
// Original in JSON file
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEF...lines of key data...\n-----END PRIVATE KEY-----\n"
}
```

```
// In .env file
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEF...lines of key data...\n-----END PRIVATE KEY-----\n"
```

## Step 6: Share Calendars with the Service Account

For each user's calendar you want to access:

1. Have the user go to [Google Calendar](https://calendar.google.com/)
2. Click the three dots (⋮) next to the calendar name in the left sidebar
3. Select "Settings and sharing"
4. Scroll down to "Share with specific people or groups"
5. Click "Add people"
6. Enter your service account email address
7. Set permission level to "Make changes to events" (or higher if needed)
8. Click "Send"

## Step 7: Using Calendar IDs

When creating or querying calendar events, you'll need to provide a Calendar ID:

- For a user's primary calendar, the Calendar ID is their email address
- For other calendars, you can find the Calendar ID in the calendar settings under "Integrate calendar" > "Calendar ID"

## Step 8: Testing the Integration

To verify your setup:

1. Ensure your service account credentials are correctly set in environment variables
2. Start your application with `npm run dev`
3. Sign in to the application
4. On the dashboard, try to create a new calendar event
5. Check that the event appears in the corresponding Google Calendar
6. Try to fetch calendar events for a specified date range

## Troubleshooting

### Common Error Messages

1. **404 Calendar Not Found**
   - The Calendar ID is incorrect
   - The calendar hasn't been shared with the service account
   - Solution: Verify the Calendar ID and sharing settings

2. **403 Forbidden**
   - The service account doesn't have sufficient permissions
   - Solution: Check the permission level in calendar sharing settings

3. **401 Unauthorized**
   - Invalid service account credentials
   - Solution: Verify your environment variables are correctly set

### Environment Variable Issues

- **Private Key Format**: Ensure the private key has proper `\n` characters for newlines
- **Quotes**: Make sure the private key is properly enclosed in quotes
- **Special Characters**: Check that no special characters are lost during copy/paste

## Alternative: OAuth2 Authentication

If you prefer user-based authentication instead of a service account:

1. Create OAuth consent screen in Google Cloud Console
2. Configure the required scopes for Google Calendar
3. Create OAuth credentials (Web application)
4. Set up redirect URIs for your application
5. Configure your application to handle OAuth flow
6. Update your integration code to use OAuth tokens

This approach requires users to explicitly authorize your application to access their calendars, rather than manually sharing calendars with a service account.

## Security Considerations

- Store service account credentials securely
- Use environment variables or a secrets manager
- Never commit credentials to version control
- Implement minimal scope access (least privilege principle)
- Consider encrypting credentials at rest 