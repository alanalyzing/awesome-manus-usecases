import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Share2, Users, X } from "lucide-react";
import { useLocation } from "wouter";

const STORAGE_KEY = "manus-ucl-welcome-dismissed";

export function WelcomePopup() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Only show on first visit
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Small delay so the page renders first
        const timer = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable (e.g. private browsing), skip popup
    }
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleShare = () => {
    handleDismiss();
    navigate("/submit");
  };

  const handleTeamPlan = () => {
    handleDismiss();
    window.open("https://manus.im/team", "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/50 gap-0">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-foreground/5">
                <Sparkles className="w-5 h-5 text-foreground/70" />
              </div>
              <DialogTitle className="font-serif text-xl font-bold tracking-tight">
                {t("welcome.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {t("welcome.desc")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-3 space-y-3">
          {/* Primary CTA: Share Use Case */}
          <Button
            onClick={handleShare}
            className="w-full h-11 gap-2 font-medium"
            variant="default"
          >
            <Share2 className="w-4 h-4" />
            {t("welcome.shareBtn")}
          </Button>

          {/* Secondary CTA: Team Plan */}
          <Button
            onClick={handleTeamPlan}
            variant="outline"
            className="w-full h-11 gap-2 font-medium"
          >
            <Users className="w-4 h-4" />
            {t("welcome.teamBtn")}
          </Button>

          {/* Dismiss link */}
          <button
            onClick={handleDismiss}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 cursor-pointer"
          >
            {t("welcome.dismiss")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
