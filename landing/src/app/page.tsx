"use client";

import { useEffect } from "react";
import { Globe } from "@/components/ui/globe";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Particles } from "@/components/ui/particles";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap, Users, Code, Brain, ChevronRight, Github, Chrome, ExternalLink, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHROME_STORE_URL, GITHUB_REPO_URL } from "@/lib/constants";

// Testimonial data
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Engineering Manager @ Meta",
    quote: "Finally, a tool that actually helps me understand candidates beyond their resume. The archetype system is genius.",
    avatar: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "Technical Recruiter @ Google",
    quote: "Vibechekk saved me 5+ hours per week. I can now quickly identify hidden gems in our pipeline.",
    avatar: "MJ",
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Talent @ Stripe",
    quote: "The AI detection feature is incredible. We use it to understand how candidates actually work.",
    avatar: "ER",
  },
  {
    name: "Alex Kim",
    role: "Engineering Lead @ OpenAI",
    quote: "Finally moved beyond star counts. The trajectory analysis shows the full picture of a developer's growth.",
    avatar: "AK",
  },
  {
    name: "Jessica Park",
    role: "Tech Recruiter @ Anthropic",
    quote: "The Hidden Gem archetype helped us find amazing candidates our competitors overlooked.",
    avatar: "JP",
  },
  {
    name: "David Miller",
    role: "VP Engineering @ Notion",
    quote: "Vibechekk is now mandatory in our hiring workflow. It's transformed how we evaluate technical talent.",
    avatar: "DM",
  },
];

// Feature data
const features = [
  {
    icon: <Target className="w-6 h-6" />,
    title: "JD Matching",
    description: "Match candidates to job requirements with AI-powered fit scores and skill gap analysis.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Analysis",
    description: "Get recruiter-ready assessments in seconds. No waiting, no manual review.",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "15 Archetypes",
    description: "Beyond generic labels. Identify 10x Engineers, Hidden Gems, Architects, and more.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Code-Level Insights",
    description: "We analyze actual code, not just repo metadata. Real technical signal.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Detection",
    description: "Know if candidates use Claude, Copilot, or ChatGPT. Modern hiring signal.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Quality First",
    description: "Tests, CI/CD, code quality standards. We check what actually matters.",
  },
];

// Archetype badges
const archetypes = [
  { name: "THE 10X ENGINEER", tier: "LEGENDARY", color: "bg-amber-600 text-white border-amber-700" },
  { name: "THE ARCHITECT", tier: "ULTRA RARE", color: "bg-purple-600 text-white border-purple-700" },
  { name: "THE SPECIALIST", tier: "RARE", color: "bg-blue-600 text-white border-blue-700" },
  { name: "THE HIDDEN GEM", tier: "UNCOMMON", color: "bg-emerald-600 text-white border-emerald-700" },
  { name: "THE CRAFTSPERSON", tier: "UNCOMMON", color: "bg-emerald-600 text-white border-emerald-700" },
  { name: "THE BUILDER", tier: "UNCOMMON", color: "bg-emerald-600 text-white border-emerald-700" },
];

const TestimonialCard = ({ name, role, quote, avatar }: { name: string; role: string; quote: string; avatar: string }) => (
  <figure className="relative w-80 cursor-pointer overflow-hidden rounded-xl border p-6 mx-4 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
    <div className="flex flex-row items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-semibold text-primary">
        {avatar}
      </div>
      <div className="flex flex-col">
        <figcaption className="text-sm font-semibold text-foreground">{name}</figcaption>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
    <blockquote className="mt-4 text-sm text-muted-foreground leading-relaxed">&ldquo;{quote}&rdquo;</blockquote>
  </figure>
);

export default function LandingPage() {
  useEffect(() => {
    // Referral Tracking: Capture ?ref=CODE and save to cookie
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      // Save for 30 days
      const d = new Date();
      d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
      const expires = "expires=" + d.toUTCString();
      // Set cookie accessible to subdomain/root
      document.cookie = "referral_code=" + refCode + ";" + expires + ";path=/;domain=.vibechekk.dev";

      // Also set without domain for localhost testing or exact match
      document.cookie = "referral_code=" + refCode + ";" + expires + ";path=/";

      console.log('Ref code captured:', refCode);
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Particles Background */}
      <Particles
        className="absolute inset-0 -z-10"
        quantity={80}
        staticity={50}
        color="#3b82f6"
        ease={50}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vibechekk" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight">Vibechekk</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2" asChild>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="w-4 h-4" />
                Star on GitHub
              </a>
            </Button>
            <ShimmerButton
              className="h-9 px-4"
              onClick={() => window.open(CHROME_STORE_URL, '_blank')}
            >
              <Chrome className="w-4 h-4 mr-2" />
              Install Extension
            </ShimmerButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left">
              <BlurFade delay={0.1}>
                <div className="inline-flex items-center gap-2 mb-6">
                  <Badge variant="outline" className="text-sm px-4 py-1.5 rounded-full border-primary/30 bg-primary/5 text-foreground gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Trusted by the best recruiters
                    <ChevronRight className="w-4 h-4" />
                  </Badge>
                </div>
              </BlurFade>

              <BlurFade delay={0.2}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                  Find the devs who actually{" "}
                  <AnimatedShinyText className="inline text-primary">
                    fit your JD
                  </AnimatedShinyText>
                </h1>
              </BlurFade>

              <BlurFade delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                  Vibechekk analyzes GitHub profiles and resumes to reveal the best developers in your pipeline for your JD.
                  <span className="font-semibold text-foreground"> In seconds.</span>
                </p>
              </BlurFade>

              <BlurFade delay={0.4}>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <ShimmerButton
                    className="h-12 px-8 text-base font-semibold"
                    onClick={() => window.open(CHROME_STORE_URL, '_blank')}
                  >
                    <Chrome className="w-5 h-5 mr-2" />
                    Install Chrome Extension
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </ShimmerButton>
                </div>
              </BlurFade>

              <BlurFade delay={0.5}>
                <div className="flex flex-wrap items-center gap-3 mt-8 justify-center lg:justify-start">
                  {archetypes.slice(0, 4).map((arch, i) => (
                    <Badge key={i} variant="outline" className={cn("text-xs font-medium", arch.color)}>
                      {arch.name}
                    </Badge>
                  ))}
                  <span className="text-sm text-muted-foreground">+11 more</span>
                </div>
              </BlurFade>
            </div>

            {/* Right Globe */}
            <div className="flex-1 relative">
              <BlurFade delay={0.6}>
                <div className="relative w-full aspect-square max-w-[500px] mx-auto">
                  <Globe className="w-full h-full" />
                  {/* Floating Cards */}
                  <div className="absolute top-10 -left-4 bg-card/90 backdrop-blur-md rounded-xl p-4 border shadow-lg animate-float">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-500 font-bold">10x</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Elite Confirmed</p>
                        <p className="text-xs text-muted-foreground">THE 10X ENGINEER</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-20 -right-4 bg-card/90 backdrop-blur-md rounded-xl p-4 border shadow-lg animate-float-delayed">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-emerald-500 font-bold">💎</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">High Potential</p>
                        <p className="text-xs text-muted-foreground">Hidden strengths revealed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </BlurFade>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Beyond resumes. Beyond stars.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We analyze what actually matters for your JD: code quality, development practices,
                and technical fit. Not vanity metrics.
              </p>
            </div>
          </BlurFade>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <BlurFade key={i} delay={0.1 + i * 0.1}>
                <div className="relative group bg-card rounded-2xl p-6 border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                  <BorderBeam size={200} duration={10} delay={i * 2} />
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* PRO Features Section - CrossChekk, AutoChekk, BulkChekk */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1}>
            <div className="text-center mb-16">
              <Badge variant="outline" className="text-sm px-4 py-1.5 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-500 mb-4">
                PRO Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Supercharge your screening
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Screen, evaluate, and compare candidates at scale with powerful automation tools.
              </p>
            </div>
          </BlurFade>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* CrossChekk - Dark Green theme */}
            <BlurFade delay={0.2}>
              <div className="relative group h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full rounded-3xl p-8 border border-emerald-900/50 hover:border-emerald-800/70 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #1a3d2e 0%, #0f2419 100%)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 flex items-center justify-center mb-6 border border-emerald-900/50">
                    <svg className="w-7 h-7 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-white">CrossChekk</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-black">PRO</span>
                  </div>
                  <p className="text-emerald-200/70 mb-6 leading-relaxed">
                    Match candidates to jobs with AI-powered fit scores and skill gap analysis.
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3 text-emerald-200/70">
                      <span className="w-5 h-5 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Paste JD & add candidate profiles
                    </li>
                    <li className="flex items-center gap-3 text-emerald-200/70">
                      <span className="w-5 h-5 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      AI match scores & skill gap analysis
                    </li>
                    <li className="flex items-center gap-3 text-emerald-200/70">
                      <span className="w-5 h-5 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Save JDs & compare results
                    </li>
                  </ul>
                </div>
              </div>
            </BlurFade>

            {/* AutoChekk - Black/Dark theme */}
            <BlurFade delay={0.3}>
              <div className="relative group h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/20 to-zinc-700/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full bg-zinc-900 rounded-3xl p-8 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 border border-zinc-700">
                    <svg className="w-7 h-7 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-white">AutoChekk</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-black">PRO</span>
                  </div>
                  <p className="text-zinc-400 mb-6 leading-relaxed">
                    Automatic analysis on every email and GitHub account you visit while browsing.
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3 text-zinc-400">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Zero-click passive analysis
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Live activity feed
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Email detection & lookup
                    </li>
                  </ul>
                </div>
              </div>
            </BlurFade>

            {/* BulkChekk - Navy Blue theme */}
            <BlurFade delay={0.4}>
              <div className="relative group h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative h-full rounded-3xl p-8 border border-blue-900/50 hover:border-blue-800/70 transition-all duration-300" style={{ background: 'linear-gradient(135deg, #1a2744 0%, #0f1929 100%)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-blue-950/80 flex items-center justify-center mb-6 border border-blue-900/50">
                    <svg className="w-7 h-7 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-white">BulkChekk</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-black">PRO</span>
                  </div>
                  <p className="text-blue-200/70 mb-6 leading-relaxed">
                    Upload CSV, Excel, or PDF resumes and analyze multiple candidates at once.
                  </p>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3 text-blue-200/70">
                      <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      CSV, Excel, or PDF resume upload
                    </li>
                    <li className="flex items-center gap-3 text-blue-200/70">
                      <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Email-to-GitHub resolution
                    </li>
                    <li className="flex items-center gap-3 text-blue-200/70">
                      <span className="w-5 h-5 rounded-full bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </span>
                      Batch history & progress tracking
                    </li>
                  </ul>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>



      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Start free. Upgrade when you need more power.
              </p>
            </div>
          </BlurFade>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <BlurFade delay={0.2}>
              <div className="relative bg-card rounded-2xl p-8 border hover:border-primary/30 transition-all duration-300">
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <p className="text-muted-foreground text-sm mb-6">For getting started</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["2 vibechekks", "All 15 archetypes", "AI detection", "Chrome extension"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full">Get Started</Button>
              </div>
            </BlurFade>

            {/* Pro Tier */}
            <BlurFade delay={0.3}>
              <div className="relative bg-card rounded-2xl p-8 border-2 border-primary shadow-lg scale-105">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
                </div>
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm mb-6">For serious recruiters</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Unlimited vibechekks", "Everything in Free", "CrossChekk & BulkChekk", "AutoChekk mode", "Priority support"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <ShimmerButton className="w-full h-11">Start Free Trial</ShimmerButton>
              </div>
            </BlurFade>

            {/* Enterprise Tier */}
            <BlurFade delay={0.4}>
              <div className="relative bg-card rounded-2xl p-8 border hover:border-primary/30 transition-all duration-300">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <p className="text-muted-foreground text-sm mb-6">For teams at scale</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Everything in Pro", "Team analytics", "ATS integration", "Custom archetypes", "Dedicated support", "SSO / SAML"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <BlurFade delay={0.1}>
            <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-12 border overflow-hidden">
              <BorderBeam size={300} duration={15} />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to find your next{" "}
                <TypingAnimation
                  className="inline text-primary"
                  duration={100}
                >
                  10x Engineer?
                </TypingAnimation>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join 500+ recruiters and engineering managers who use Vibechekk
                to identify exceptional talent. Free to start.
              </p>
              <div className="flex justify-center">
                <ShimmerButton
                  className="h-14 px-10 text-lg font-semibold"
                  onClick={() => window.open(CHROME_STORE_URL, '_blank')}
                >
                  <Chrome className="w-5 h-5 mr-2" />
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </ShimmerButton>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Vibechekk" className="w-6 h-6" />
            <span className="font-semibold">Vibechekk</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Vibechekk. Made with ❤️ for technical recruiters.
          </p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition">Privacy</a>
            <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition">Terms</a>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 3s ease-in-out infinite 1.5s;
        }
      `}</style>
    </div>
  );
}
