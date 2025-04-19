import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// This endpoint is for debugging environment variables
// It only shows IF variables exist, not their actual values
export async function GET(request: Request) {
    try {
        // Verify the user is authenticated with Clerk for security
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized. User not authenticated." },
                { status: 401 }
            );
        }

        // Check which environment variables are defined
        const envStatus = {
            // Google Calendar Integration
            GOOGLE_SERVICE_ACCOUNT_EMAIL_EXISTS: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_EXISTS: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
            GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET_EXISTS: !!process.env.GOOGLE_CLIENT_SECRET,

            // Clerk Authentication
            CLERK_SECRET_KEY_EXISTS: !!process.env.CLERK_SECRET_KEY,
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_EXISTS: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,

            // Other variables
            NODE_ENV: process.env.NODE_ENV,
            APP_ENV: process.env.APP_ENV || 'not set',
        };

        // Check for private key formatting issues
        let privateKeyFormatStatus = "Not set";
        if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes("\\n")) {
                privateKeyFormatStatus = "Contains escaped newlines (\\n) - may need unescaping";
            } else if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes("\n")) {
                privateKeyFormatStatus = "Contains actual newlines - correct format";
            } else if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes("BEGIN PRIVATE KEY")) {
                privateKeyFormatStatus = "Missing 'BEGIN PRIVATE KEY' - likely malformed";
            } else {
                privateKeyFormatStatus = "Set, but format could not be determined";
            }
        }

        return NextResponse.json({
            message: "Environment variables status - only showing existence, not values",
            envStatus,
            privateKeyFormatStatus,
            nextConfig: {
                // Display how Next.js is accessing environment variables
                reactStrictMode: process.env.NEXT_PUBLIC_STRICT_MODE === 'true',
                runsInProduction: process.env.NODE_ENV === 'production',
            }
        });
    } catch (error: any) {
        console.error("Error checking environment variables:", error);
        return NextResponse.json(
            {
                error: "Failed to check environment variables",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
} 