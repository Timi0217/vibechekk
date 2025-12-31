'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReferralRedirect() {
    const params = useParams();
    const router = useRouter();
    const code = params.code as string;

    useEffect(() => {
        if (code) {
            // Save referral code to cookie (30 days)
            const d = new Date();
            d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
            const expires = "expires=" + d.toUTCString();

            // Set cookie for the domain
            document.cookie = `referral_code=${code};${expires};path=/;domain=.vibechekk.dev`;
            document.cookie = `referral_code=${code};${expires};path=/`;

            console.log('Referral code saved:', code);

            // Redirect to main page with ref param (for tracking)
            router.replace(`/?ref=${code}`);
        }
    }, [code, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Redirecting...</p>
            </div>
        </div>
    );
}
