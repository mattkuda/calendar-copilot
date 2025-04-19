'use client'
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
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
                    <h1 className="text-3xl font-bold mt-8">Create Account</h1>
                    <p className="text-muted-foreground">
                        Sign up for Calendar Copilot to manage your calendar with AI.
                    </p>
                </div>

                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <SignUp
                        routing="path"
                        path="/auth/signup"
                        signInUrl="/auth/signin"
                        afterSignUpUrl="/dashboard"
                    />
                </div>
            </div>
        </div>
    )
} 