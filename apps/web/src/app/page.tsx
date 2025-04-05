'use client'

import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { useAuth } from "@clerk/nextjs"

export default function Home() {
    const { isSignedIn, isLoaded } = useAuth();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center space-y-8 p-4">
            <div className="flex flex-col items-center space-y-4 text-center">
                <div className="p-3 rounded-full bg-primary/10">
                    <CalendarDays className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold">Calendar Copilot</h1>
                <p className="text-lg text-muted-foreground max-w-md">
                    Connect your Google Calendar and interact with it using natural language through Claude.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                {isLoaded && isSignedIn ? (
                    <Link
                        href="/dashboard"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                        View Dashboard
                    </Link>
                ) : (
                    <>
                        <Link
                            href="/auth/signin"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth/signup"
                            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        >
                            Sign Up
                        </Link>
                    </>
                )}
            </div>

            <div className="mt-8 max-w-2xl text-center">
                <h2 className="text-xl font-semibold mb-4">How it works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-medium mb-2">1. Connect</h3>
                        <p className="text-sm text-muted-foreground">Sign in with Google and connect your calendar.</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-medium mb-2">2. Ask</h3>
                        <p className="text-sm text-muted-foreground">Ask Claude about your schedule or create events with natural language.</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <h3 className="font-medium mb-2">3. Manage</h3>
                        <p className="text-sm text-muted-foreground">View and manage all your calendar events in one place.</p>
                    </div>
                </div>
            </div>
        </div>
    )
} 