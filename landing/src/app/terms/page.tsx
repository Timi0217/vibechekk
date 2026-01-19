"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { Particles } from "@/components/ui/particles";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
                        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                        <p className="text-muted-foreground mb-8">Last updated: January 1, 2026</p>
                    </BlurFade>

                    <BlurFade delay={0.2}>
                        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    By accessing or using Vibechekk (&quot;the Service&quot;), including the Chrome extension, website,
                                    and API, you agree to be bound by these Terms of Service. If you do not agree to these terms,
                                    do not use the Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Vibechekk is a developer screening and analysis platform that:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                                    <li>Analyzes publicly available GitHub profiles and resumes</li>
                                    <li>Classifies developers into archetype categories</li>
                                    <li>Provides code quality assessments and insights</li>
                                    <li>Detects usage patterns of AI coding assistants</li>
                                    <li>Matches candidates to job descriptions with AI-powered fit scoring (CrossChekk)</li>
                                    <li>Automatically analyzes profiles as you browse GitHub (AutoChekk)</li>
                                    <li>Batch processes multiple candidates at once (BulkChekk)</li>
                                    <li>Generates recruiter-ready summaries and assessments</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>

                                <h3 className="text-xl font-medium mt-6 mb-3">3.1 Account Creation</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    You may create an account using Google or GitHub OAuth. You are responsible for maintaining
                                    the security of your account and all activities that occur under your account.
                                </p>

                                <h3 className="text-xl font-medium mt-6 mb-3">3.2 Account Tiers</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Free:</strong> 2 vibechekks, all 15 archetypes, AI detection, Chrome extension</li>
                                    <li><strong>Pro ($99/month):</strong> Unlimited vibechekks, everything in Free, CrossChekk & BulkChekk for job matching, AutoChekk mode for automatic analysis, priority support</li>
                                    <li><strong>Enterprise (Custom pricing):</strong> Everything in Pro, team analytics, ATS integration, custom archetypes, dedicated support, SSO/SAML</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
                                <p className="text-muted-foreground leading-relaxed mb-4">
                                    You agree NOT to use the Service to:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Violate any applicable laws or regulations</li>
                                    <li>Harass, stalk, or discriminate against any individual</li>
                                    <li>Make hiring decisions based solely on Vibechekk reports without proper human review</li>
                                    <li>Scrape, data-mine, or extract data beyond normal use of the Service</li>
                                    <li>Attempt to circumvent usage limits or access controls</li>
                                    <li>Reverse engineer or attempt to extract source code</li>
                                    <li>Impersonate another person or entity</li>
                                    <li>Use automated systems to access the Service in a manner that exceeds reasonable use</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>

                                <h3 className="text-xl font-medium mt-6 mb-3">5.1 Our Rights</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    The Service, including its design, features, and content, is owned by Vibechekk and protected
                                    by intellectual property laws. You may not copy, modify, distribute, or create derivative
                                    works without our permission.
                                </p>

                                <h3 className="text-xl font-medium mt-6 mb-3">5.2 Your Data</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    You retain ownership of any data you provide to us. By using the Service, you grant us a
                                    license to use your data to provide and improve the Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">6. Third-Party Data</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Vibechekk analyzes publicly available GitHub data. We are not affiliated with GitHub, Inc.
                                    The analysis and archetype classifications are our proprietary assessments and should be
                                    considered as one data point among many in your evaluation process.
                                </p>
                                <p className="text-muted-foreground leading-relaxed mt-4">
                                    <strong>Important:</strong> Vibechekk reports are intended to supplement, not replace,
                                    thorough hiring practices including interviews, reference checks, and skills assessments.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">7. Payment Terms</h2>

                                <h3 className="text-xl font-medium mt-6 mb-3">7.1 Subscription</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    Pro subscriptions are billed monthly at $99 USD. Enterprise pricing is custom based on team size and requirements. All payments are processed securely through Stripe.
                                </p>

                                <h3 className="text-xl font-medium mt-6 mb-3">7.2 Cancellation</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    You may cancel your subscription at any time. Upon cancellation, you will retain Pro access
                                    until the end of your current billing period.
                                </p>

                                <h3 className="text-xl font-medium mt-6 mb-3">7.3 Refunds</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    We offer refunds on a case-by-case basis. Contact us within 14 days of purchase if you
                                    are unsatisfied with the Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">8. Disclaimer of Warranties</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                                    EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                                    <li>The Service will be uninterrupted or error-free</li>
                                    <li>Analysis results will be 100% accurate</li>
                                    <li>The Service will meet your specific requirements</li>
                                    <li>Any defects will be corrected</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, VIBECHEKK SHALL NOT BE LIABLE FOR ANY INDIRECT,
                                    INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                                    <li>Loss of profits or revenue</li>
                                    <li>Loss of data</li>
                                    <li>Hiring decisions made based on our analysis</li>
                                    <li>Business interruption</li>
                                </ul>
                                <p className="text-muted-foreground leading-relaxed mt-4">
                                    Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    You agree to indemnify and hold harmless Vibechekk and its officers, directors, employees,
                                    and agents from any claims, damages, losses, or expenses arising from your use of the Service
                                    or violation of these Terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We may suspend or terminate your account at any time for violation of these Terms or for
                                    any other reason at our discretion. Upon termination, your right to use the Service will
                                    immediately cease.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">12. Changes to Terms</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    We reserve the right to modify these Terms at any time. We will notify you of material
                                    changes by posting the new Terms on this page. Your continued use of the Service after
                                    changes constitutes acceptance of the modified Terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    These Terms shall be governed by and construed in accordance with the laws of the
                                    United States, without regard to conflict of law principles.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Any disputes arising from these Terms or the Service shall first be attempted to be
                                    resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved
                                    through binding arbitration.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">15. Severability</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    If any provision of these Terms is found to be unenforceable, the remaining provisions
                                    will continue in full force and effect.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4">16. Contact Us</h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    If you have questions about these Terms, please contact us at:
                                </p>
                                <p className="text-muted-foreground mt-4">
                                    <strong>Email:</strong> legal@vibechekk.dev
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
