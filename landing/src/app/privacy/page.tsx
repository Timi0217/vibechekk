"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="relative min-h-screen bg-background">
            <Particles
                className="absolute inset-0 -z-10"
                quantity={40}
                staticity={60}
                color="#3b82f6"
                ease={50}
            />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="pt-24 pb-16 px-6">
                <div className="max-w-4xl mx-auto">
                    <BlurFade delay={0.1}>
                        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                        <p className="text-muted-foreground mb-8">Last updated: January 1, 2026</p>
                    </BlurFade>

                    <BlurFade delay={0.2}>
                        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Welcome to Vibechekk (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy
                                    and ensuring transparency about how we collect, use, and share information. This Privacy Policy
                                    explains our practices regarding the Vibechekk Chrome extension, web services, and screening features including CrossChekk, AutoChekk, and BulkChekk.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

                                <h3 className="text-xl font-medium mt-6 mb-3">2.1 Information You Provide</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Account information (email, name) when you sign in with Google or GitHub</li>
                                    <li>Payment information processed securely through Stripe (we do not store payment details)</li>
                                    <li>GitHub profile URLs you choose to analyze</li>
                                    <li>Job descriptions and candidate information for CrossChekk matching</li>
                                    <li>Candidate lists uploaded via BulkChekk (CSV files)</li>
                                    <li>Resume files uploaded for analysis</li>
                                </ul>

                                <h3 className="text-xl font-medium mt-6 mb-3">2.2 Information We Collect Automatically</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Usage data including analysis history and feature usage</li>
                                    <li>Device information such as browser type and operating system</li>
                                    <li>IP address for rate limiting and security purposes</li>
                                </ul>

                                <h3 className="text-xl font-medium mt-6 mb-3">2.3 GitHub Data We Access</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    When analyzing GitHub profiles, we access only <strong>publicly available</strong> information including:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Public repositories and their metadata (stars, forks, languages)</li>
                                    <li>Public commit history and contribution graphs</li>
                                    <li>Public profile information (bio, location, company)</li>
                                    <li>Code samples from public repositories for quality analysis</li>
                                </ul>
                                <p className="text-muted-foreground mt-4 leading-relaxed">
                                    We do <strong>not</strong> access private repositories or any non-public GitHub data.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>To provide and improve the Vibechekk service and screening tools</li>
                                    <li>To generate developer archetype classifications and assessments</li>
                                    <li>To match candidates to job descriptions with CrossChekk AI-powered fit scoring</li>
                                    <li>To automatically analyze developer profiles with AutoChekk mode</li>
                                    <li>To batch process candidate lists via BulkChekk</li>
                                    <li>To maintain your analysis history and preferences</li>
                                    <li>To process payments and manage subscriptions</li>
                                    <li>To communicate with you about your account and updates</li>
                                    <li>To enforce our terms and prevent abuse</li>
                                    <li>To improve our AI models and analysis accuracy</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    We do not sell your personal information. We may share information in the following circumstances:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Service Providers:</strong> We use third-party services including Stripe (payments),
                                        Railway (hosting), Vercel (website hosting), and DeepSeek (AI analysis)</li>
                                    <li><strong>Legal Requirements:</strong> We may disclose information if required by law</li>
                                    <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We retain your account information as long as your account is active. Analysis reports are
                                    cached for up to 30 days to improve performance. You may request deletion of your data at
                                    any time by contacting us.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Security</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We implement industry-standard security measures including:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Encrypted data transmission (HTTPS/TLS)</li>
                                    <li>Secure token-based authentication (JWT)</li>
                                    <li>Rate limiting to prevent abuse</li>
                                    <li>Regular security reviews</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    Depending on your location, you may have the following rights:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Access and receive a copy of your data</li>
                                    <li>Correct inaccurate information</li>
                                    <li>Request deletion of your data</li>
                                    <li>Object to or restrict certain processing</li>
                                    <li>Data portability</li>
                                </ul>
                                <p className="text-muted-foreground mt-4 leading-relaxed">
                                    To exercise these rights, please contact us at privacy@vibechekk.dev
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Chrome Extension Permissions</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    The Vibechekk Chrome extension requests the following permissions:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Storage:</strong> To save your preferences and authentication state locally</li>
                                    <li><strong>Identity:</strong> To enable Google Sign-In functionality</li>
                                    <li><strong>SidePanel:</strong> To display the Vibechekk interface</li>
                                    <li><strong>Host Permissions:</strong> To analyze GitHub profiles and integrate with ATS platforms</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Vibechekk is not intended for users under 18 years of age. We do not knowingly collect
                                    personal information from children.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We may update this Privacy Policy from time to time. We will notify you of any material
                                    changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    If you have questions about this Privacy Policy or our practices, please contact us at:
                                </p>
                                <p className="text-muted-foreground mt-4">
                                    <strong>Email:</strong> privacy@vibechekk.dev
                                </p>
                            </section>

                        </div>
                    </BlurFade>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 px-6 border-t">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Vibechekk" className="w-6 h-6" />
                        <span className="font-semibold">Vibechekk</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Vibechekk. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
