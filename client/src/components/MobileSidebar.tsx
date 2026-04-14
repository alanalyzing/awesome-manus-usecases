import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ExternalLink, X, Trophy, ArrowUp, BookOpen, Info } from "lucide-react";
import { Link } from "wouter";
import { MadeWithManusBadge } from "./ManusLogo";

const LEARN_MORE_LINKS = [
  { name: "Team Plan", url: "https://manus.im/team" },
  { name: "Trust Center", url: "https://trust.manus.im/" },
];

const SOCIAL_LINKS = [
  { name: "LinkedIn", url: "https://www.linkedin.com/company/maboroshiinc/" },
  { name: "X / Twitter", url: "https://x.com/maboroshi_inc" },
  { name: "YouTube", url: "https://www.youtube.com/@manus_im" },
  { name: "Instagram", url: "https://www.instagram.com/manus_im/" },
  { name: "TikTok", url: "https://www.tiktok.com/@manus_im" },
];

interface Category {
  id: number;
  name: string;
  slug: string;
  type: string;
}

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategories: number[];
  highlightOnly: boolean;
  onCategoryToggle: (id: number) => void;
  onHighlightToggle: () => void;
  onShowAll: () => void;
}

function MobileLeaderboard() {
  const leaderboardQuery = trpc.admin.contributorLeaderboard.useQuery({ limit: 5 });
  const entries = leaderboardQuery.data ?? [];

  if (leaderboardQuery.isLoading) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <Trophy size={12} />
          Top Contributors
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-3 bg-muted rounded w-20 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
        <Trophy size={12} />
        Top Contributors
      </h3>
      <div className="space-y-0.5">
        {entries.map((entry: any, index: number) => (
          <Link
            key={entry.userId}
            href={entry.username ? `/profile/${entry.username}` : "#"}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="relative shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden ${
                index === 0
                  ? "bg-primary/15 text-primary"
                  : index === 1
                  ? "bg-primary/10 text-primary/80"
                  : "bg-muted text-muted-foreground"
              }`}>
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (entry.name || "A").charAt(0).toUpperCase()
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border border-background ${
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : index === 1
                  ? "bg-primary/80 text-primary-foreground"
                  : "bg-muted-foreground/60 text-background"
              }`}>
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{entry.name || "Anonymous"}</div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
              <span className="tabular-nums">{entry.approvedCount}</span>
              <span className="flex items-center gap-0.5 tabular-nums">
                <ArrowUp size={9} />
                {entry.totalUpvotes}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/leaderboard" className="block mt-2 px-2">
        <span className="text-[11px] text-primary hover:underline">View full leaderboard →</span>
      </Link>
    </div>
  );
}

export function MobileSidebar({
  open,
  onClose,
  categories,
  selectedCategories,
  highlightOnly,
  onCategoryToggle,
  onHighlightToggle,
  onShowAll,
}: MobileSidebarProps) {
  const { t } = useI18n();

  const jobFunctionCats = categories.filter((c) => c.type === "job_function");
  const featureCats = categories.filter((c) => c.type === "feature");

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground border-r shadow-xl lg:hidden animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-serif font-bold text-sm">{t("sidebar.allUseCases")}</span>
          <button onClick={onClose} className="p-1.5 hover:bg-sidebar-accent rounded-md">
            <X size={18} />
          </button>
        </div>
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <div className="p-4 space-y-5">
            {/* All Use Cases */}
            <button
              onClick={() => { onShowAll(); onClose(); }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !highlightOnly && selectedCategories.length === 0
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              }`}
            >
              {t("sidebar.allUseCases")}
            </button>

            {/* Only Possible with Manus */}
            <button
              onClick={() => { onHighlightToggle(); onClose(); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                highlightOnly
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "hover:bg-primary/5 text-primary/80"
              }`}
            >
              <Sparkles size={15} />
              {t("sidebar.highlights")}
            </button>

            <Separator />

            {/* Job Function */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {t("sidebar.byJobFunction")}
              </h3>
              <div className="space-y-0.5">
                {jobFunctionCats.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { onCategoryToggle(cat.id); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                    }`}
                  >
                    <span>{t(`cat.${cat.slug}` as any) || cat.name}</span>
                    {(cat as any).count > 0 && (
                      <span className="text-xs text-muted-foreground/60 tabular-nums">{(cat as any).count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* By Feature */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {t("sidebar.byFeature")}
              </h3>
              <div className="space-y-0.5">
                {featureCats.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { onCategoryToggle(cat.id); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                    }`}
                  >
                    <span>{t(`cat.${cat.slug}` as any) || cat.name}</span>
                    {(cat as any).count > 0 && (
                      <span className="text-xs text-muted-foreground/60 tabular-nums">{(cat as any).count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Contributor Leaderboard */}
            <MobileLeaderboard />

            <Separator />

            {/* Learn More */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {t("sidebar.learnMore")}
              </h3>
              <div className="space-y-0.5">
                <Link href="/about">
                  <span
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
                  >
                    <Info size={13} />
                    {t("sidebar.aboutPortal")}
                  </span>
                </Link>
                {LEARN_MORE_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <BookOpen size={13} />
                    {link.name}
                  </a>
                ))}
              </div>
            </div>

            <Separator />

            {/* Social Links */}
            <div className="space-y-1">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                >
                  <ExternalLink size={13} />
                  {link.name}
                </a>
              ))}
            </div>

            <div className="pt-2 px-1">
              <MadeWithManusBadge />
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
