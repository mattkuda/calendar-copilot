'use client';

import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SSOCallbackPage() {
    const { handleRedirectCallback } = useClerk();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Get the "after_sign_in_url" query param which will tell us where to redirect after sign-in
        const afterSignInUrl = searchParams.get('after_sign_in_url') || '/dashboard';

        async function handleCallback() {
            try {
                // Process the OAuth callback
                await handleRedirectCallback({
                    redirectUrl: afterSignInUrl,
                });
            } catch (error) {
                console.error('Error verifying OAuth callback', error);
                router.push('/auth/signin?error=oauth_verification_failed');
            }
        }

        handleCallback();
    }, [handleRedirectCallback, router, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h2 className="text-2xl font-semibold mb-4">Processing authentication...</h2>
                <p className="text-muted-foreground">Please wait while we complete your sign-in process.</p>
            </div>
        </div>
    );
} 