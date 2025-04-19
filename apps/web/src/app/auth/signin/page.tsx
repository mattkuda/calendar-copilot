'use client'
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { SignIn } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function SignInPage() {
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for error parameter in the URL
        const errorParam = searchParams.get('error');
        if (errorParam) {
            switch (errorParam) {
                case 'oauth_verification_failed':
                    setError('Authentication verification failed. Please try again.');
                    break;
                default:
                    setError('An error occurred during sign in. Please try again.');
                    break;
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
                    <h1 className="text-3xl font-bold mt-8">Connect Your Calendar</h1>
                    <p className="text-muted-foreground">
                        Connect your Google Calendar to enable AI-powered calendar management.
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <div className="space-y-4">
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                By connecting your Google Calendar, you'll be able to:
                            </p>
                            <ul className="text-sm text-left space-y-2">
                                <li className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    View your events in Calendar Copilot
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    Use Claude to query your calendar using natural language
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    Create new events using natural language commands
                                </li>
                            </ul>
                        </div>

                        <div className="pt-4">
                            <SignIn
                                routing="path"
                                path="/auth/signin"
                                signUpUrl="/auth/signup"
                                afterSignInUrl="/dashboard"
                            />
                        </div>

                        <div className="text-xs text-center text-muted-foreground mt-4">
                            Calendar Copilot will only access your calendar data with your permission.
                            <br />
                            We do not store your events permanently.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 