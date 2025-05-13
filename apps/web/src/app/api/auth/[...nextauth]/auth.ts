import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Add custom type declarations
declare module "next-auth" {
    interface Session {
        accessToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events openid email profile",
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Save the access token and refresh token in the JWT on the initial sign-in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            return token;
        },
        async session({ session, token }) {
            // Make access token available to the client
            session.accessToken = token.accessToken;
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
    },
    session: {
        strategy: "jwt",
    },
}; 