import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowUp,
  Eye,
  Calendar,
  Share2,
  ExternalLink,
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useCallback } from "react";
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
    if (useCaseQuery.data) {
      toggleUpvote.mutate({ useCaseId: useCaseQuery.data.id });
    }
  }, [useCaseQuery.data, toggleUpvote]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t("detail.copied"));
    });
  }, [t]);

  const uc = useCaseQuery.data;

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
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleShare}>
            <Share2 size={14} />
            {t("detail.share")}
          </Button>
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
              <ArrowUp size={14} />
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
        <h1 className="font-serif text-3xl font-bold mb-3">{uc.title}</h1>

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
            <span>
              {t("detail.submittedBy")} <strong>{uc.submitterName}</strong>
            </span>
          )}
        </div>

        {/* Category tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {uc.categories.map((cat) => (
            <Badge key={cat.id} variant="secondary">
              {cat.name}
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
          <MarkdownContent content={uc.description ?? ""} />
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
    </div>
  );
}
