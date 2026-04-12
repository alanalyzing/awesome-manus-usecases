import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ExternalLink, X } from "lucide-react";
import { MadeWithManusBadge } from "./ManusLogo";

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
                  ? "bg-manus-highlight/15 text-manus-highlight ring-1 ring-manus-highlight/30"
                  : "hover:bg-manus-highlight/10 text-manus-highlight/80"
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
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                    }`}
                  >
                    {t(`cat.${cat.slug}` as any) || cat.name}
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
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                    }`}
                  >
                    {t(`cat.${cat.slug}` as any) || cat.name}
                  </button>
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
