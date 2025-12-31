"use client";

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
import { ArrowRight, Sparkles, Shield, Zap, Users, Code, Brain, ChevronRight, Github, Chrome, ExternalLink } from "lucide-react";
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
    icon: <Brain className="w-6 h-6" />,
    title: "15 Archetypes",
    description: "Beyond generic labels. Identify 10x Engineers, Hidden Gems, Architects, and more.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Detection",
    description: "Know if candidates use Claude, Copilot, or ChatGPT. Modern hiring signal.",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Analysis",
    description: "Get recruiter-ready assessments in seconds. No waiting, no manual review.",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Quality First",
    description: "Tests, CI/CD, TypeScript adoption. We check what actually matters.",
  },
  {
    icon: <Code className="w-6 h-6" />,
    title: "Code-Level Insights",
    description: "We analyze actual code, not just repo metadata. Real technical signal.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Team Fit",
    description: "Understand which teams and projects a candidate would thrive on.",
  },
];

// Archetype badges
const archetypes = [
  { name: "THE 10X ENGINEER", tier: "LEGENDARY", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { name: "THE ARCHITECT", tier: "ULTRA RARE", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { name: "THE SPECIALIST", tier: "RARE", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { name: "THE HIDDEN GEM", tier: "UNCOMMON", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "THE CRAFTSPERSON", tier: "UNCOMMON", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { name: "THE BUILDER", tier: "UNCOMMON", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Vibechekk</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition">Features</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition">Testimonials</a>
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
                    Trusted by 500+ recruiters
                    <ChevronRight className="w-4 h-4" />
                  </Badge>
                </div>
              </BlurFade>

              <BlurFade delay={0.2}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                  Hire devs who{" "}
                  <AnimatedShinyText className="inline text-primary">
                    actually ship.
                  </AnimatedShinyText>
                </h1>
              </BlurFade>

              <BlurFade delay={0.3}>
                <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                  Vibechekk analyzes GitHub profiles to reveal archetypes, code quality, and AI usage.
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
                  <Button variant="outline" size="lg" className="h-12 px-6" asChild>
                    <a href="#features">
                      See Features
                    </a>
                  </Button>
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
                        <p className="font-semibold text-sm">Legendary Found</p>
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
                        <p className="font-semibold text-sm">Hidden Gem</p>
                        <p className="text-xs text-muted-foreground">Underrated talent</p>
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
                We analyze what actually matters: code quality, development practices,
                and growth trajectory. Not vanity metrics.
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

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <BlurFade delay={0.1}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Loved by top recruiters
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See why engineering managers and recruiters at top companies trust Vibechekk.
              </p>
            </div>
          </BlurFade>

          <Marquee pauseOnHover className="[--duration:40s]">
            {testimonials.map((testimonial, i) => (
              <TestimonialCard key={i} {...testimonial} />
            ))}
          </Marquee>
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
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["Unlimited vibechekks", "Everything in Free", "Export reports", "Bulk chekk", "Priority support"].map((feature, i) => (
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
              <ShimmerButton
                className="h-14 px-10 text-lg font-semibold"
                onClick={() => window.open(CHROME_STORE_URL, '_blank')}
              >
                <Chrome className="w-5 h-5 mr-2" />
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </ShimmerButton>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
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
