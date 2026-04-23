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
  Heart,
  Eye,
  Calendar,
  Share2,
  ExternalLink,
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Star,
  Link2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useCallback, useEffect, useMemo } from "react";
import { AdminEditDialog } from "@/components/AdminEditDialog";
import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";

interface UseCaseModalProps {
  slug: string | null;
  onClose: () => void;
  slugList?: string[];
  onNavigate?: (slug: string) => void;
}

export function UseCaseModal({ slug, onClose, slugList, onNavigate }: UseCaseModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

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

  const shareUrl = `${window.location.origin}/use-case/${slug}`;

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success(t("detail.copied"));
    });
  }, [shareUrl, t]);

  const handleShareLinkedIn = useCallback(() => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  const handleShareTwitter = useCallback(() => {
    const title = document.querySelector('h2')?.textContent || slug || '';
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, "_blank", "noopener,noreferrer");
  }, [shareUrl, slug]);

  const handleShareFacebook = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  const handleOpenFullPage = useCallback(() => {
    if (slug) {
      onClose();
      navigate(`/use-case/${slug}`);
    }
  }, [slug, onClose, navigate]);

  const uc = useCaseQuery.data;
  const screenshots = uc?.screenshots ?? [];

  // Translation overlay for non-English locales
  const { locale } = useI18n();
  const ucIds = useMemo(() => uc ? [uc.id] : [], [uc?.id]);
  const { data: translationsMap } = trpc.useCases.translations.useQuery(
    { useCaseIds: ucIds, locale },
    { enabled: locale !== "en" && ucIds.length > 0, staleTime: 5 * 60 * 1000 }
  );
  const translatedTitle = (locale !== "en" && translationsMap && uc && translationsMap[uc.id]?.title) || uc?.title || "";
  const translatedDescription = (locale !== "en" && translationsMap && uc && translationsMap[uc.id]?.description) || uc?.description || "";

  // Translations for related use cases
  const relatedIds = useMemo(() => relatedQuery.data?.map((r) => r.id) ?? [], [relatedQuery.data]);
  const { data: relatedTranslationsMap } = trpc.useCases.translations.useQuery(
    { useCaseIds: relatedIds, locale },
    { enabled: locale !== "en" && relatedIds.length > 0, staleTime: 5 * 60 * 1000 }
  );

  return (
    <>
    <Dialog open={!!slug} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{uc?.title || "Use Case Details"}</DialogTitle>

        {/* Admin prev/next navigation */}
        {user?.role === "admin" && slugList && slugList.length > 1 && onNavigate && (() => {
          const currentIndex = slug ? slugList.indexOf(slug) : -1;
          const hasPrev = currentIndex > 0;
          const hasNext = currentIndex >= 0 && currentIndex < slugList.length - 1;
          return (
            <div className="flex items-center justify-between px-5 py-2 border-b bg-muted/40 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                disabled={!hasPrev}
                onClick={() => hasPrev && onNavigate(slugList[currentIndex - 1])}
              >
                <ChevronLeft size={14} />
                {t("modal.previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1} / {slugList.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                disabled={!hasNext}
                onClick={() => hasNext && onNavigate(slugList[currentIndex + 1])}
              >
                {t("modal.next")}
                <ChevronRight size={14} />
              </Button>
            </div>
          );
        })()}

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Share2 size={14} />
                  {t("detail.share")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
                  <Link2 size={14} />
                  {t("modal.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareLinkedIn} className="gap-2 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareTwitter} className="gap-2 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareFacebook} className="gap-2 cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <Heart size={14} className={uc?.hasUpvoted ? "fill-current" : ""} />
              </motion.div>
              {uc?.upvoteCount ?? 0}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setEditingSlug(slug)}>
                <Pencil size={14} />
                {t("modal.edit")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleOpenFullPage}>
              <ExternalLink size={14} className="mr-1" />
              {t("modal.fullPage")}
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
                <h2 className="font-serif text-2xl font-bold mb-3">{translatedTitle}</h2>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
                  {uc.aiScore && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                      <Star size={12} className="fill-amber-500 text-amber-500" />
                      {Number(uc.aiScore.overall).toFixed(1)}
                    </span>
                  )}
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
                      {t(`cat.${cat.slug}` as any) || cat.name}
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
                  <MarkdownContent content={translatedDescription} />
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
                                {(locale !== "en" && relatedTranslationsMap?.[related.id]?.title) || related.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {(() => { const translatedDesc = locale !== "en" ? relatedTranslationsMap?.[related.id]?.description : undefined; const desc = translatedDesc || related.description || ""; return stripMarkdown(desc); })()}
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

    {/* Admin Edit Dialog */}
    {user?.role === "admin" && (
      <AdminEditDialog
        slug={editingSlug}
        onClose={() => setEditingSlug(null)}
        onSaved={() => {
          setEditingSlug(null);
          useCaseQuery.refetch();
        }}
      />
    )}
    </>
  );
}
