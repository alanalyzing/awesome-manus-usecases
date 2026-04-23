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
              {t("about.backToGallery")}
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
              {t("about.title")}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {t("about.subtitle")}
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
            {t("about.whatIsTitle")}
          </h2>
          <div className="space-y-4 text-foreground/85 leading-relaxed">
            <p>{t("about.whatIsP1")}</p>
            <p>{t("about.whatIsP2")}</p>
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
            {t("about.whatToExpect")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <BookOpen size={18} className="text-primary/70" />
                {t("about.curatedTitle")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("about.curatedDesc")}
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Users size={18} className="text-primary/70" />
                {t("about.communityTitle")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("about.communityDesc")}
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Zap size={18} className="text-primary/70" />
                {t("about.realTitle")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("about.realDesc")}
              </p>
            </div>
            <div className="bg-card border rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Shield size={18} className="text-primary/70" />
                {t("about.transparentTitle")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("about.transparentDesc")}
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
            {t("about.builtWithTitle")}
          </h2>
          <div className="space-y-4 text-foreground/85 leading-relaxed">
            <p>{t("about.builtWithP1")}</p>
            <p>{t("about.builtWithP2")}</p>
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
            {t("about.learnMoreTitle")}
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
                {t("about.manusTagline")}
              </p>
            </a>
            <a
              href="https://manus.im/about"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {t("about.aboutManus")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("about.aboutManusDesc")}
              </p>
            </a>
            <a
              href="https://manus.im/team"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {t("about.teamPlan")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("about.teamPlanDesc")}
              </p>
            </a>
            <a
              href="https://trust.manus.im/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {t("about.trustCenter")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("about.trustCenterDesc")}
              </p>
            </a>
            <a
              href="/submit"
              className="bg-card border rounded-xl p-5 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {t("about.submitYours")}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("about.submitYoursDesc")}
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
            "{t("about.quote")}"
          </blockquote>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ManusGlyph size={16} />
            <span>{t("about.quoteAttrib")}</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
