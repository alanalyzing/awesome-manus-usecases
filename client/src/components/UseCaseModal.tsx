import { useAuth } from "@/_core/hooks/useAuth";
import { MarkdownContent, stripMarkdown } from "@/components/MarkdownContent";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUp,
  Eye,
  Calendar,
  Share2,
  ExternalLink,
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";

interface UseCaseModalProps {
  slug: string | null;
  onClose: () => void;
}

export function UseCaseModal({ slug, onClose }: UseCaseModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const useCaseQuery = trpc.useCases.getBySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const relatedQuery = trpc.useCases.related.useQuery(
    {
      useCaseId: useCaseQuery.data?.id ?? 0,
      categoryIds: useCaseQuery.data?.categories.map((c) => c.id) ?? [],
    },
    { enabled: !!useCaseQuery.data?.id }
  );

  const toggleUpvote = trpc.useCases.toggleUpvote.useMutation({
    onSuccess: () => {
      useCaseQuery.refetch();
    },
  });

  // Reset screenshot index when slug changes
  useEffect(() => {
    setActiveScreenshot(0);
  }, [slug]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (slug) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [slug, onClose]);

  const handleUpvote = useCallback(() => {
    if (!user) {
      toast.error("Please sign in to upvote", {
        action: {
          label: "Sign In",
          onClick: () => { window.location.href = getLoginUrl(); },
        },
      });
      return;
    }
    if (useCaseQuery.data) {
      toggleUpvote.mutate({ useCaseId: useCaseQuery.data.id });
    }
  }, [useCaseQuery.data, toggleUpvote, user]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/use-case/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("detail.copied"));
    });
  }, [slug, t]);

  const handleOpenFullPage = useCallback(() => {
    if (slug) {
      onClose();
      navigate(`/use-case/${slug}`);
    }
  }, [slug, onClose, navigate]);

  const uc = useCaseQuery.data;
  const screenshots = uc?.screenshots ?? [];

  return (
    <Dialog open={!!slug} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{uc?.title || "Use Case Details"}</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleShare}>
              <Share2 size={14} />
              {t("detail.share")}
            </Button>
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                uc?.hasUpvoted
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-accent border-border"
              }`}
            >
              <motion.div
                whileTap={{ scale: 1.3, rotate: -10 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowUp size={14} />
              </motion.div>
              {uc?.upvoteCount ?? 0}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleOpenFullPage}>
              <ExternalLink size={14} className="mr-1" />
              Full Page
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="max-h-[calc(90vh-4rem)]">
          <div className="px-6 py-5">
            {useCaseQuery.isLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="aspect-[16/9] bg-muted rounded-xl" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ) : uc ? (
              <>
                {/* Highlight badge */}
                {uc.isHighlight && (
                  <Badge className="bg-primary text-primary-foreground border-0 gap-1 mb-4">
                    <Sparkles size={12} />
                    {t("detail.onlyManus")}
                  </Badge>
                )}

                {/* Title */}
                <h2 className="font-serif text-2xl font-bold mb-3">{uc.title}</h2>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(uc.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {uc.viewCount} {t("gallery.views")}
                  </span>
                  {uc.submitterName && (
                     <span className="flex items-center gap-1.5">
                       <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
                         {uc.submitterAvatar ? (
                           <img src={uc.submitterAvatar} alt="" className="h-full w-full object-cover" />
                         ) : (
                           uc.submitterName.charAt(0).toUpperCase()
                         )}
                       </span>
                       {t("detail.submittedBy")}{" "}
                       {uc.submitterUsername ? (
                         <Link href={`/profile/${uc.submitterUsername}`} className="font-semibold text-primary hover:underline">
                           {uc.submitterName}
                         </Link>
                       ) : (
                         <strong>{uc.submitterName}</strong>
                       )}
                     </span>
                   )}
                </div>

                {/* Category tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {uc.categories.map((cat) => (
                    <Badge key={cat.id} variant="secondary">
                      {cat.name}
                    </Badge>
                  ))}
                </div>

                {/* Screenshot Gallery */}
                {screenshots.length > 0 && (
                  <div className="mb-6">
                    <div className="relative rounded-xl overflow-hidden border bg-muted">
                      <img
                        src={screenshots[activeScreenshot]?.url}
                        alt={`Screenshot ${activeScreenshot + 1}`}
                        className="w-full object-contain max-h-[400px]"
                      />
                      {screenshots.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                            aria-label="Previous screenshot"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            onClick={() => setActiveScreenshot((prev) => (prev + 1) % screenshots.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                            aria-label="Next screenshot"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    {screenshots.length > 1 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {screenshots.map((ss, i) => (
                          <button
                            key={ss.id}
                            onClick={() => setActiveScreenshot(i)}
                            className={`shrink-0 w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                              i === activeScreenshot ? "border-primary" : "border-transparent opacity-60 hover:opacity-80"
                            }`}
                            aria-label={`View screenshot ${i + 1}`}
                          >
                            <img src={ss.url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="max-w-none mb-6 text-foreground/90 leading-relaxed">
                  <MarkdownContent content={uc.description ?? ""} />
                </div>

                {/* Action Links */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {uc.sessionReplayUrl && (
                    <a href={uc.sessionReplayUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <Play size={16} />
                        {t("detail.sessionReplay")}
                      </Button>
                    </a>
                  )}
                  {uc.deliverableUrl && (
                    <a href={uc.deliverableUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-2">
                        <ExternalLink size={16} />
                        {t("detail.deliverable")}
                      </Button>
                    </a>
                  )}
                </div>

                {/* Related Use Cases */}
                {relatedQuery.data && relatedQuery.data.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="font-serif text-lg font-bold mb-3">{t("detail.related")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {relatedQuery.data.map((related) => (
                          <button
                            key={related.id}
                            onClick={() => {
                              onClose();
                              setTimeout(() => navigate(`/use-case/${related.slug}`), 100);
                            }}
                            className="group text-left bg-card rounded-lg border hover:shadow-md transition-all p-3 flex gap-3"
                          >
                            {related.screenshots[0] && (
                              <div className="w-16 h-10 rounded-md overflow-hidden shrink-0 bg-muted">
                                <img
                                  src={related.screenshots[0].url}
                                  alt={related.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary/80 transition-colors">
                                {related.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {stripMarkdown(related.description ?? "")}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Use case not found
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
