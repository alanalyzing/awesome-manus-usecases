import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Heart,
  Eye,
  Calendar,
  ExternalLink,
  Twitter,
  Linkedin,
  Copy,
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { AdminEditDialog } from "@/components/AdminEditDialog";
import { MarkdownContent } from "@/components/MarkdownContent";
import { motion } from "framer-motion";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";

export default function UseCaseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
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

  const handleUpvote = useCallback(() => {
    if (!isAuthenticated) {
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
  }, [useCaseQuery.data, toggleUpvote, isAuthenticated]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link")
    );
  }, []);

  const handleShareTwitter = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out this Manus use case: ${useCaseQuery.data?.title || ""}`);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, "_blank");
  }, [useCaseQuery.data?.title]);

  const handleShareLinkedIn = useCallback(() => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  }, []);

  const uc = useCaseQuery.data;

  // Translation overlay for non-English locales
  const { locale } = useI18n();
  const ucIds = useMemo(() => uc ? [uc.id] : [], [uc?.id]);
  const { data: translationsMap } = trpc.useCases.translations.useQuery(
    { useCaseIds: ucIds, locale },
    { enabled: locale !== "en" && ucIds.length > 0, staleTime: 5 * 60 * 1000 }
  );
  const translatedTitle = (locale !== "en" && translationsMap && uc && translationsMap[uc.id]?.title) || uc?.title || "";
  const translatedDescription = (locale !== "en" && translationsMap && uc && translationsMap[uc.id]?.description) || uc?.description || "";

  if (useCaseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="aspect-[16/9] bg-muted rounded-xl" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!uc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold mb-2">Use case not found</h2>
          <Link href="/">
            <Button variant="outline" className="gap-2 mt-4">
              <ArrowLeft size={16} />
              Back to Gallery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const screenshots = uc.screenshots ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft size={14} />
              Back
            </Button>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs mr-2" onClick={() => setEditingSlug(slug ?? null)}>
                <Pencil size={14} />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShareTwitter} title="Share on X (Twitter)">
              <Twitter size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleShareLinkedIn} title="Share on LinkedIn">
              <Linkedin size={14} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCopyLink} title="Copy link">
              <Copy size={14} />
            </Button>
          </div>
          <button
            onClick={handleUpvote}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
              uc.hasUpvoted
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-accent border-border"
            }`}
          >
            <motion.div
              whileTap={{ scale: 1.3, rotate: -10 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Heart size={14} className={uc.hasUpvoted ? "fill-current" : ""} />
            </motion.div>
            {uc.upvoteCount}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Highlight badge */}
        {uc.isHighlight && (
          <Badge className="bg-primary text-primary-foreground border-0 gap-1 mb-4">
            <Sparkles size={12} />
            {t("detail.onlyManus")}
          </Badge>
        )}

        {/* Title */}
        <h1 className="font-serif text-3xl font-bold mb-3">{translatedTitle}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
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
        <div className="flex flex-wrap gap-2 mb-6">
          {uc.categories.map((cat) => (
            <Badge key={cat.id} variant="secondary">
              {t(`cat.${cat.slug}` as any) || cat.name}
            </Badge>
          ))}
        </div>

        {/* Screenshot Gallery */}
        {screenshots.length > 0 && (
          <div className="mb-8">
            <div className="relative rounded-xl overflow-hidden border bg-muted">
              <img
                src={screenshots[activeScreenshot]?.url}
                alt={`Screenshot ${activeScreenshot + 1}`}
                className="w-full object-contain max-h-[500px]"
              />
              {screenshots.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveScreenshot((prev) => (prev + 1) % screenshots.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-background transition-colors"
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
                  >
                    <img src={ss.url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <div className="max-w-none mb-8 text-foreground/90 leading-relaxed">
          <MarkdownContent content={translatedDescription} />
        </div>

        {/* Action Links */}
        <div className="flex flex-wrap gap-3 mb-8">
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

        <Separator className="my-8" />

        {/* Related Use Cases */}
        {relatedQuery.data && relatedQuery.data.length > 0 && (
          <div>
            <h2 className="font-serif text-xl font-bold mb-4">{t("detail.related")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedQuery.data.map((related) => (
                <Link key={related.id} href={`/use-case/${related.slug}`}>
                  <div className="group bg-card rounded-lg border hover:shadow-md transition-all p-4 flex gap-3">
                    {related.screenshots[0] && (
                      <div className="w-20 h-14 rounded-md overflow-hidden shrink-0 bg-muted">
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
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {related.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
