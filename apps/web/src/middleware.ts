import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Define public routes that everyone (signed-in or not) can access
const publicRoutes = [
    "/",
    "/auth/signin",
    "/auth/signup",
    "/api/webhooks/clerk"
];

const isPublicRoute = createRouteMatcher(publicRoutes);

export default clerkMiddleware(async (auth, request) => {
    const req = request as NextRequest;
    const path = req.nextUrl.pathname;

    // Get the authenticated state
    const { userId } = await auth();

    // Allow public routes and API routes
    if (isPublicRoute(req) || path.startsWith('/api/')) {
        // If authenticated and accessing sign-in/sign-up, redirect to dashboard
        if (userId && (path === '/auth/signin' || path === '/auth/signup' || path === '/')) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        return NextResponse.next();
    }

    // If not signed in and trying to access protected route, redirect to sign in
    if (!userId && path.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Match all routes except static files and Next.js internals
        "/((?!_next|[^?]*\\.(html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        "/(api|trpc)(.*)", // Include API routes
    ],
}; 