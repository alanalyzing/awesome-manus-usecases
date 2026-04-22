import { useI18n } from "@/lib/i18n";
import { ManusGlyph } from "@/components/ManusLogo";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Users,
  Shield,
  BookOpen,
  ExternalLink,
  Zap,
  Globe,
  Heart,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function About() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={16} />
              Back to Gallery
            </button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeIn}
          className="mb-16"
        >
          <div className="flex items-center gap-3 mb-6">
            <ManusGlyph size={36} />
            <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
              About This Portal
            </h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            A community-curated gallery of real-world use cases built with{" "}
            <a
              href="https://manus.im"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors"
            >
              Manus
            </a>
            , the general AI agent that extends human reach.
          </p>
        </motion.div>

        {/* What is this portal */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeIn}
          className="mb-14"
        >
          <h2 className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
            <Globe size={22} className="text-muted-foreground" />
            What is Awesome Manus Use Cases?
          </h2>
          <div className="space-y-4 text-foreground/85 leading-relaxed">
            <p>
              This portal is a living collection of real workflows, projects, and solutions that
              people have built using Manus. From marketing campaigns and financial analyses to
              full-stack web applications and research reports, every entry here represents a
              genuine problem solved by a real person with the help of AI.
            </p>
            <p>
              Our goal is to inspire you. Whether you're exploring what Manus can do, looking for
              ideas for your next project, or trying to understand how others in your industry
              leverage AI agents, this gallery is your starting point.
            </p>
          </div>
        </motion.section>

        <Separator className="mb-14" />

        {/* What to expect */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeIn}
          className="mb-14"
        >
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={22} className="text-muted-foreground" />
            What to Expect
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <BookOpen size={18} className="text-primary/70" />
                Curated Quality
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every submission is reviewed by our moderation team and scored by AI to ensure
                it's genuine, well-documented, and useful to the community.
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Users size={18} className="text-primary/70" />
                Community Driven
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Anyone can submit a use case. Upvote the ones you find most valuable, and
                contribute your own to help others discover what's possible.
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Zap size={18} className="text-primary/70" />
                Real Workflows
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                These aren't hypothetical demos. Each use case includes the actual prompt,
                screenshots, and session replay links so you can see exactly how it was done.
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Shield size={18} className="text-primary/70" />
                Transparent & Open
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Browse by job function or feature. Filter by industry. Every use case is
                categorized and searchable to help you find exactly what's relevant.
              </p>
            </div>
          </div>
        </motion.section>

        <Separator className="mb-14" />

        {/* Built with Manus */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeIn}
          className="mb-14"
        >
          <h2 className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
            <Heart size={22} className="text-muted-foreground" />
            Built with Manus
          </h2>
          <div className="space-y-4 text-foreground/85 leading-relaxed">
            <p>
              This portal itself was built entirely using Manus. The database schema, backend API,
              frontend UI, AI-powered moderation scoring, multilingual support, and even this About
              page were all created through conversations with the Manus agent. It's a use case
              about use cases.
            </p>
            <p>
              Manus believes in extending human reach. Others have built the brain for AI to think;
              Manus is building the hands for AI to do. By putting the full power of AI to work for
              everyone — not just engineers — Manus helps people operate at a scale previously
              impossible, automating workflows and deploying production-ready solutions in minutes,
              not months.
            </p>
          </div>
        </motion.section>

        <Separator className="mb-14" />

        {/* Links */}
        <motion.section
          initial="hidden"
          animate="visible"
          custom={4}
          variants={fadeIn}
          className="mb-14"
        >
          <h2 className="font-serif text-2xl font-bold mb-6 flex items-center gap-2">
            <ExternalLink size={22} className="text-muted-foreground" />
            Learn More
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <a
              href="https://manus.im"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                Manus
              </div>
              <p className="text-xs text-muted-foreground">
                The general AI agent
              </p>
            </a>
            <a
              href="https://manus.im/about"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                About Manus
              </div>
              <p className="text-xs text-muted-foreground">
                Our mission and vision
              </p>
            </a>
            <a
              href="https://manus.im/team"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                Team Plan
              </div>
              <p className="text-xs text-muted-foreground">
                Manus for your whole team
              </p>
            </a>
            <a
              href="https://trust.manus.im/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                Trust Center
              </div>
              <p className="text-xs text-muted-foreground">
                Security, privacy, and compliance
              </p>
            </a>
            <a
              href="/submit"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                Submit Yours
              </div>
              <p className="text-xs text-muted-foreground">
                Share your use case with the community
              </p>
            </a>
          </div>
        </motion.section>

        {/* Footer quote */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={5}
          variants={fadeIn}
          className="text-center py-10"
        >
          <blockquote className="font-serif text-xl md:text-2xl italic text-muted-foreground mb-3">
            "Others have built the brain for AI to think.
            <br />
            Manus is building the hands for AI to do."
          </blockquote>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ManusGlyph size={16} />
            <span>Hands on AI</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
