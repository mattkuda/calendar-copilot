import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that everyone (signed-in or not) can access
const publicRoutes = [
    "/",
    "/auth/signin(.*)",
    "/auth/signup(.*)",
    "/auth/signin/sso-callback(.*)", // Explicitly include SSO callback URLs
    "/api/webhooks/clerk"
];

// Clerk-specific callback patterns
const authCallbackPatterns = [
    /^\/auth\/signin\/sso-callback(.*)/,
    /^\/clerk(.*)/,
    /^\/verify(.*)/
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isApiRoute = createRouteMatcher(["/api(.*)"]);
const shouldRedirectToDashboard = createRouteMatcher(["/auth/signin(.*)", "/auth/signup(.*)"]);
const shouldRedirectToSignIn = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, request) => {
    const { userId } = await auth();
    const req = request as NextRequest;
    const { pathname } = req.nextUrl;

    // Check for auth callback URLs and allow them to proceed
    // This is critical for OAuth and other authentication flows
    for (const pattern of authCallbackPatterns) {
        if (pattern.test(pathname)) {
            return NextResponse.next();
        }
    }

    // ✅ Allow API requests to pass through
    if (isApiRoute(req)) {
        return NextResponse.next();
    }

    // ✅ Handle public routes
    if (isPublicRoute(req)) {
        // If authenticated and accessing sign-in/sign-up, redirect to dashboard
        if (userId && shouldRedirectToDashboard(req)) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        // If authenticated and visiting the homepage, redirect to dashboard
        if (userId && pathname === "/") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        return NextResponse.next();
    }

    // ✅ Handle protected routes
    if (!userId && shouldRedirectToSignIn(req)) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Match all routes except static files, Next.js internals, and Clerk auth paths
        "/((?!_next|static|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico)).*)",
        "/(api)(.*)", // Include API routes
    ],
}; 