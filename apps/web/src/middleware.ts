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

// Clerk-specific paths that should always pass through
const clerkRoutes = [
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/sso-callback(.*)",
    "/(api|trpc)(.*)"
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isClerkRoute = createRouteMatcher(clerkRoutes);
const isApiRoute = createRouteMatcher(["/api(.*)"]);
const shouldRedirectToDashboard = createRouteMatcher(["/auth/signin(.*)", "/auth/signup(.*)"]);
const shouldRedirectToSignIn = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();
    const request = req as NextRequest;
    const { pathname } = request.nextUrl;

    // Always pass through Clerk's internal routes
    if (isClerkRoute(request)) {
        return NextResponse.next();
    }

    // ✅ Allow API requests to pass through
    if (isApiRoute(request)) {
        return NextResponse.next();
    }

    // ✅ Handle public routes
    if (isPublicRoute(request)) {
        // If authenticated and accessing sign-in/sign-up, redirect to dashboard
        if (userId && shouldRedirectToDashboard(request)) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        // If authenticated and visiting the homepage, redirect to dashboard
        if (userId && pathname === "/") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }

        return NextResponse.next();
    }

    // ✅ Handle protected routes
    if (!userId && shouldRedirectToSignIn(request)) {
        return NextResponse.redirect(new URL("/auth/signin", request.url));
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