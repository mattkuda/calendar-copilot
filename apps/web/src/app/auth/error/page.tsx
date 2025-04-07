'use client';

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState("An authentication error occurred");

    useEffect(() => {
        // Get error code from URL
        const code = searchParams.get('code');
        const message = searchParams.get('message');

        if (message) {
            setErrorMessage(message);
        } else if (code) {
            switch (code) {
                case 'oauth_error':
                    setErrorMessage('There was a problem connecting with Google. Please try again.');
                    break;
                case 'oauth_no_account':
                    setErrorMessage('No Google account was found. Please sign up first.');
                    break;
                case 'external_account_not_found':
                    setErrorMessage('The external account was not found. Please ensure you\'ve set up Google OAuth in your Clerk dashboard.');
                    break;
                default:
                    setErrorMessage(`Authentication error (${code}). Please try again.`);
            }
        }
    }, [searchParams]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold mt-8">Authentication Error</h1>
                </div>

                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
                            <h2 className="font-semibold text-lg mb-2">Error</h2>
                            <p>{errorMessage}</p>
                        </div>

                        <p className="text-muted-foreground text-sm">
                            This error often happens when Google OAuth is not properly configured in your Clerk dashboard.
                            Make sure you've:
                        </p>

                        <ul className="text-sm space-y-2 list-disc pl-5">
                            <li>Added Google as an OAuth provider in your Clerk dashboard</li>
                            <li>Configured the correct redirect URI in Google Cloud Console</li>
                            <li>Enabled the Google Calendar API in Google Cloud Console</li>
                            <li>Added the necessary Calendar scopes to your OAuth configuration</li>
                        </ul>

                        <div className="pt-4 flex flex-col space-y-3">
                            <Link
                                href="/auth/signin"
                                className="inline-flex justify-center items-center h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
                            >
                                Try Again
                            </Link>
                            <Link
                                href="/"
                                className="inline-flex justify-center items-center h-10 px-4 py-2 border border-input bg-background hover:bg-accent text-sm rounded-md"
                            >
                                Return to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 