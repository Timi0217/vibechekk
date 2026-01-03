'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Particles } from "@/components/ui/particles";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { Github, Sparkles, Shield, Zap, TrendingUp, ChevronLeft } from "lucide-react";
import Link from 'next/link';
import { BACKEND_URL, CHROME_STORE_URL } from '@/lib/constants';

export default function ClaimProfilePage() {
    const params = useParams();
    const handle = params.handle as string;
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!handle) return;

        async function fetchReport() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/public/report/${handle}`);
                const data = await res.json();
                if (data.success) {
                    setReport(data.data);
                } else {
                    setError(data.error || 'Report not found');
                }
            } catch (err) {
                setError('Failed to load analysis');
            } finally {
                setLoading(false);
            }
        }

        fetchReport();
    }, [handle]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
                <h1 className="text-2xl font-bold mb-4">{error || 'Something went wrong'}</h1>
                <Link href="/">
                    <ShimmerButton className="h-10 px-6">Back to Home</ShimmerButton>
                </Link>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-background overflow-hidden text-foreground">
            <Particles className="absolute inset-0 -z-10" quantity={50} color="#3b82f6" />

            <nav className="fixed top-0 left-0 right-0 z-50 p-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Vibechekk
                </Link>
            </nav>

            <main className="max-w-3xl mx-auto pt-32 pb-20 px-6 text-center">
                <BlurFade delay={0.1}>
                    <Badge variant="outline" className="mb-6 px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-primary gap-2">
                        <Sparkles className="w-4 h-4" />
                        Analysis Found
                    </Badge>
                </BlurFade>

                <BlurFade delay={0.2}>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {report.handle}'s analysis is ready.
                    </h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        You've been classified as:
                    </p>
                </BlurFade>

                <BlurFade delay={0.3}>
                    <div className="bg-card/50 backdrop-blur-xl border-2 border-primary/20 rounded-3xl p-12 mb-12 relative overflow-hidden group hover:border-primary/40 transition-all duration-500 shadow-2xl shadow-primary/10">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                        <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">💎</div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-4 text-primary">
                            {report.archetype}
                        </h2>
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30">
                            {report.tier} Rarity
                        </Badge>
                    </div>
                </BlurFade>

                <BlurFade delay={0.4}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 text-left">
                        {[
                            { icon: <Shield className="text-blue-500" />, title: "Detailed Stats", text: "See your code quality scores" },
                            { icon: <Zap className="text-amber-500" />, title: "Open to Work", text: "Signal to top technical recruiters" },
                            { icon: <TrendingUp className="text-emerald-500" />, title: "Growth Map", text: "Visualize your career trajectory" },
                            { icon: <Github className="text-purple-500" />, title: "Private Signal", text: "Add private repos for richer signal" }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <div className="mt-1">{item.icon}</div>
                                <div>
                                    <h3 className="font-bold text-sm">{item.title}</h3>
                                    <p className="text-xs text-muted-foreground">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </BlurFade>

                <BlurFade delay={0.5}>
                    <ShimmerButton
                        className="h-16 px-12 text-xl font-bold rounded-2xl w-full md:w-auto"
                        onClick={() => window.open(CHROME_STORE_URL, '_blank')}
                    >
                        <Github className="w-6 h-6 mr-3" />
                        Claim Profile
                    </ShimmerButton>
                    <p className="mt-6 text-sm text-muted-foreground">
                        Requires installation of the Vibechekk extension
                    </p>
                </BlurFade>
            </main>
        </div>
    );
}
