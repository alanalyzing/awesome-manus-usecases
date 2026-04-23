import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslatedUseCases } from "@/hooks/useTranslatedUseCases";
import { WelcomePopup } from "@/components/WelcomePopup";
import { UseCaseChatbot } from "@/components/UseCaseChatbot";

import { stripMarkdown } from "@/components/MarkdownContent";
import BlurhashImage from "@/components/BlurhashImage";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Moon,
  Globe,
  Sparkles,
  ExternalLink,
  Shield,
  Bell,
  TrendingUp,
  Users,
  Zap,
  Heart,
  Flame,
  Trophy,
  BookOpen,
  Info,
  UserCircle,
  LogOut,
  FileText,
  Settings,
  ChevronDown,
  User,
  Rss,
  Star,
  Pencil,
  Loader2,
  Filter,
  Check,
  X,
  MessageCircle,
  Play,
  Video,
  GraduationCap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { LOCALES, type Locale } from "@/lib/i18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ManusLogo, ManusGlyph, MadeWithManusBadge } from "@/components/ManusLogo";
import { MobileSidebar } from "@/components/MobileSidebar";
import { UseCaseModal } from "@/components/UseCaseModal";
import { AdminEditDialog } from "@/components/AdminEditDialog";

/** Trending This Week section — horizontal scrollable strip */
function TrendingSection({ onCardClick }: { onCardClick: (slug: string) => void }) {
  const { t } = useI18n();
  const trendingQuery = trpc.useCases.trending.useQuery({ limit: 6 });
  const items = trendingQuery.data ?? [];
  const trendingIds = useMemo(() => items.map((uc: any) => uc.id), [items]);
  const { getTranslated: getTrendingTranslated } = useTranslatedUseCases(trendingIds);

  if (trendingQuery.isLoading) {
    return (
      <div className="border-b bg-accent/20">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-primary" />
            <h2 className="font-serif font-bold text-sm">{t("sidebar.trendingThisWeek")}</h2>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0 bg-card rounded-lg border overflow-hidden">
                <div className="aspect-[16/10] bg-muted animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="border-b bg-accent/20">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Flame size={16} className="text-primary" />
          <h2 className="font-serif font-bold text-sm">{t("sidebar.trendingThisWeek")}</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {items.map((uc: any, index: number) => (
            <motion.div
              key={uc.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="w-64 shrink-0"
            >
              <div
                className="group bg-card rounded-lg border hover:shadow-lg hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => onCardClick(uc.slug)}
              >
                <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                  {uc.screenshots?.[0] ? (
                    <BlurhashImage
                      src={uc.screenshots[0].url}
                      blurhash={uc.screenshots[0].blurhash}
                      alt={uc.title}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/20">
                      <ManusGlyph size={28} className="opacity-20" />
                    </div>
                  )}
                  {uc.isHighlight && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-primary-foreground border-0 gap-1 text-[9px] shadow-md">
                        <Sparkles size={9} />
                        {t("detail.onlyManus")}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Flame size={9} />
                    #{index + 1}
                  </div>
                  {uc.aiScore && Number(uc.aiScore.overall) > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md backdrop-blur-sm ${
                        Number(uc.aiScore.overall) >= 4 ? "bg-emerald-500/90 text-white" :
                        Number(uc.aiScore.overall) >= 3 ? "bg-amber-500/90 text-white" :
                        "bg-zinc-500/90 text-white"
                      }`}>
                        <Star size={10} className="fill-current" />
                        {Number(uc.aiScore.overall).toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-serif font-bold text-xs leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {getTrendingTranslated(uc.id, { title: uc.title, description: uc.description }).title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart size={10} />
                      {uc.upvoteCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={10} />
                      {uc.viewCount}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Featured Use Case of the Week — spotlight banner */
function FeaturedSection({ onCardClick }: { onCardClick: (slug: string) => void }) {
  const { t } = useI18n();
  const featuredQuery = trpc.useCases.featured.useQuery();
  const featured = featuredQuery.data;
  const featuredIds = useMemo(() => featured ? [featured.useCase.id] : [], [featured]);
  const { getTranslated: getFeaturedTranslated } = useTranslatedUseCases(featuredIds);

  if (featuredQuery.isLoading || !featured) return null;
  const translatedFeatured = getFeaturedTranslated(featured.useCase.id, { title: featured.useCase.title, description: featured.useCase.aiSummary || featured.useCase.description });

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} className="text-primary" />
          <h2 className="font-serif font-bold text-sm">{t("sidebar.featuredThisWeek")}</h2>
        </div>
        <div
          className="group bg-card rounded-xl border hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer"
          onClick={() => onCardClick(featured.useCase.slug)}
        >
          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 aspect-[16/10] md:aspect-auto bg-muted overflow-hidden relative">
              {featured.useCase.screenshots?.[0] ? (
                <BlurhashImage
                  src={featured.useCase.screenshots[0].url}
                  blurhash={featured.useCase.screenshots[0].blurhash}
                  alt={featured.useCase.title}
                  className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/20 min-h-[160px]">
                  <ManusGlyph size={40} className="opacity-20" />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary text-primary-foreground border-0 gap-1 text-[10px] shadow-md">
                  <Star size={10} />
                  Featured
                </Badge>
              </div>
            </div>
            <div className="flex-1 p-5 md:p-6 flex flex-col justify-center">
              <h3 className="font-serif font-bold text-lg md:text-xl leading-snug mb-2 group-hover:text-primary transition-colors">
                {translatedFeatured.title}
              </h3>
              {featured.editorialBlurb && (
                <p className="text-sm text-muted-foreground italic mb-3">"{featured.editorialBlurb}"</p>
              )}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {translatedFeatured.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {featured.useCase.categories?.map((cat: any) => (
                  <Badge key={cat.slug} variant="secondary" className="text-[10px]">{t(`cat.${cat.slug}` as any) || cat.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Collections section — horizontal scrollable strip of curated collections */
function CollectionsSection({ onCardClick }: { onCardClick: (slug: string) => void }) {
  const { t } = useI18n();
  const collectionsQuery = trpc.useCases.collections.useQuery({ publishedOnly: true });
  const cols = collectionsQuery.data ?? [];
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const expandedQuery = trpc.useCases.collectionBySlug.useQuery(
    { slug: expandedSlug ?? "" },
    { enabled: !!expandedSlug }
  );

  if (collectionsQuery.isLoading || cols.length === 0) return null;

  return (
    <div className="border-b bg-accent/10">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-primary" />
          <h2 className="font-serif font-bold text-sm">Curated Collections</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {cols.map((col: any) => (
            <div
              key={col.id}
              className={`shrink-0 w-56 bg-card rounded-lg border p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
                expandedSlug === col.slug ? "ring-2 ring-primary/30" : ""
              }`}
              onClick={() => setExpandedSlug(expandedSlug === col.slug ? null : col.slug)}
            >
              <h3 className="font-serif font-semibold text-sm mb-1 line-clamp-1">{col.title}</h3>
              {col.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{col.description}</p>
              )}
              <div className="text-[10px] text-muted-foreground">
                {col.useCaseCount} {col.useCaseCount !== 1 ? t("sidebar.useCasesCount") : t("sidebar.useCaseCount")}
              </div>
            </div>
          ))}
        </div>

        {/* Expanded collection items */}
        {expandedSlug && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            {expandedQuery.isLoading ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : expandedQuery.data?.useCases?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {expandedQuery.data.useCases.map((uc: any) => (
                  <div
                    key={uc.id}
                    className="group bg-card rounded-lg border hover:shadow-md hover:border-primary/20 transition-all duration-200 overflow-hidden cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onCardClick(uc.slug); }}
                  >
                    <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                      {uc.screenshots?.[0] ? (
                        <BlurhashImage src={uc.screenshots[0].url} blurhash={uc.screenshots[0].blurhash} alt={uc.title} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ManusGlyph size={20} className="opacity-20" /></div>
                      )}
                      {uc.aiScore && Number(uc.aiScore?.overallScore ?? uc.aiScore?.overall ?? 0) > 0 && (
                        <div className="absolute top-2 right-2">
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md backdrop-blur-sm ${
                            Number(uc.aiScore?.overallScore ?? uc.aiScore?.overall ?? 0) >= 4 ? "bg-emerald-500/90 text-white" :
                            Number(uc.aiScore?.overallScore ?? uc.aiScore?.overall ?? 0) >= 3 ? "bg-amber-500/90 text-white" :
                            "bg-zinc-500/90 text-white"
                          }`}>
                            <Star size={10} className="fill-current" />
                            {Number(uc.aiScore?.overallScore ?? uc.aiScore?.overall ?? 0).toFixed(1)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-serif font-bold text-xs line-clamp-2 group-hover:text-primary transition-colors">{uc.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">This collection is empty.</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const LEARN_MORE_LINKS = [
  { nameKey: "sidebar.productDemo" as const, url: "__demo__", icon: "video" },
  { nameKey: "sidebar.manusAcademy" as const, url: "https://academy.manus.im/", icon: "graduation" },
  { nameKey: "sidebar.trustCenter" as const, url: "https://trust.manus.im/", icon: "shield" },
  { nameKey: "sidebar.apiDocs" as const, url: "/api-docs", icon: "book" },
];

const SOCIAL_LINKS = [
  { name: "LinkedIn", url: "https://www.linkedin.com/company/maboroshiinc/" },
  { name: "X / Twitter", url: "https://x.com/maboroshi_inc" },
  { name: "YouTube", url: "https://www.youtube.com/@manus_im" },
  { name: "Instagram", url: "https://www.instagram.com/manus_im/" },
  { name: "TikTok", url: "https://www.tiktok.com/@manus_im" },
];

/** Animated counter that counts up from 0 to target */
function AnimatedCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current || target <= 0) return;
    hasAnimated.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

/** Contributor Leaderboard Widget for sidebar */
function LeaderboardWidget() {
  const { t } = useI18n();
  const leaderboardQuery = trpc.admin.contributorLeaderboard.useQuery({ limit: 5 });
  const entries = leaderboardQuery.data ?? [];

  if (leaderboardQuery.isLoading) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <Trophy size={12} />
          {t("sidebar.topContributors")}
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
        {t("sidebar.topContributors")}
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
              <div className="text-xs font-medium truncate">{entry.name || t("common.anonymous")}</div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
              <span className="tabular-nums">{entry.approvedCount} {entry.approvedCount !== 1 ? t("sidebar.useCasesCount") : t("sidebar.useCaseCount")}</span>
              <span className="flex items-center gap-0.5 tabular-nums">
                <Heart size={9} />
                {entry.totalUpvotes}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/leaderboard" className="block mt-2 px-2">
        <span className="text-[11px] text-primary hover:underline">{t("sidebar.viewLeaderboard")} →</span>
      </Link>
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const searchString = useSearch();



  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Capture the initial URL search string on first render (before wouter clears it)
  const initialSearchRef = useRef(window.location.search);
  // Pre-parse URL params for immediate state initialization (avoids race condition on reload)
  const initialParams = useMemo(() => new URLSearchParams(initialSearchRef.current), []);
  const [search, setSearch] = useState(initialParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [highlightOnly, setHighlightOnly] = useState(initialParams.get("highlight") === "true");
  const [sort, setSort] = useState<"popular" | "newest" | "views" | "score">(() => {
    const s = initialParams.get("sort");
    return s && ["popular", "newest", "views", "score"].includes(s) ? s as any : "score";
  });
  const [minScore, setMinScore] = useState<number>(0);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [limit] = useState(40);
  const [offset, setOffset] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<any[]>([]);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  // showHero removed - hero is always visible now

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Profile check for onboarding nudge
  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const hasProfile = !!profileQuery.data;

  // Queries
  const categoriesQuery = trpc.categories.list.useQuery();
  // Global count (unfiltered) for sidebar badge
  const globalCountQuery = trpc.useCases.list.useQuery({ limit: 1, offset: 0 });
  const globalTotal = globalCountQuery.data?.total ?? 0;

  const stableCategoryIds = useMemo(
    () => selectedCategories.length > 0 ? selectedCategories : undefined,
    [selectedCategories.join(",")]
  );
  const useCasesQuery = trpc.useCases.list.useQuery({
    search: search || undefined,
    categoryIds: stableCategoryIds,
    highlightOnly: highlightOnly || undefined,
    sort,
    minScore: minScore > 0 ? minScore : undefined,
    limit,
    offset,
  }, {
    placeholderData: (prev) => prev,
  });

  // Accumulate items for infinite scroll
  useEffect(() => {
    if (!useCasesQuery.data) return;
    if (offset === 0) {
      setAccumulatedItems(useCasesQuery.data.items);
    } else {
      setAccumulatedItems((prev) => {
        // Merge: update existing items with fresh data, append new ones
        const freshMap = new Map(useCasesQuery.data.items.map((item: any) => [item.id, item]));
        const updated = prev.map((item: any) => freshMap.get(item.id) ?? item);
        const existingIds = new Set(prev.map((item: any) => item.id));
        const newItems = useCasesQuery.data.items.filter((item: any) => !existingIds.has(item.id));
        return [...updated, ...newItems];
      });
    }
  }, [useCasesQuery.data, offset]);

  const toggleUpvote = trpc.useCases.toggleUpvote.useMutation({
    onSuccess: () => {
      useCasesQuery.refetch();
    },
  });

  const jobFunctionCats = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === "job_function"),
    [categoriesQuery.data]
  );
  const featureCats = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === "feature"),
    [categoriesQuery.data]
  );

  // --- URL query param sync ---
  // On mount: read ?category=slug from URL and apply to state
  // Note: highlight, sort, and search are already initialized from URL params in useState,
  // so this effect only needs to handle category (which requires categoriesQuery.data to resolve slugs)
  useEffect(() => {
    if (!categoriesQuery.data || urlInitialized) return;
    const params = new URLSearchParams(initialSearchRef.current);
    const catSlug = params.get("category");

    if (catSlug) {
      const slugs = catSlug.split(",").map((s) => s.trim()).filter(Boolean);
      const foundIds = slugs
        .map((s) => categoriesQuery.data!.find((c) => c.slug === s))
        .filter(Boolean)
        .map((c) => c!.id);
      if (foundIds.length > 0) {
        setSelectedCategories(foundIds);
        setOffset(0);
        setAccumulatedItems([]);
      }
    }
    setUrlInitialized(true);
  }, [categoriesQuery.data, urlInitialized]);

  // Sync state → URL (after initialization)
  const syncUrlRef = useRef(false);
  useEffect(() => {
    if (!urlInitialized || !categoriesQuery.data) return;
    // Skip the first render after initialization to avoid double-push
    if (!syncUrlRef.current) {
      syncUrlRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) {
      const slugs = selectedCategories
        .map((id) => categoriesQuery.data!.find((c) => c.id === id))
        .filter(Boolean)
        .map((c) => c!.slug);
      if (slugs.length > 0) params.set("category", slugs.join(","));
    }
    if (highlightOnly) params.set("highlight", "true");
    if (sort !== "score") params.set("sort", sort);
    if (search) params.set("search", search);
    const qs = params.toString();
    const newUrl = qs ? `/?${qs}` : "/";
    window.history.replaceState(null, "", newUrl);
  }, [selectedCategories, highlightOnly, sort, search, urlInitialized, categoriesQuery.data]);

  // Sidebar: single-select (replaces current selection, or deselects if same)
  const handleSidebarCategorySelect = useCallback((catId: number) => {
    setHighlightOnly(false);
    setOffset(0);
    setAccumulatedItems([]);
    setSelectedCategories((prev) =>
      prev.length === 1 && prev[0] === catId ? [] : [catId]
    );
  }, []);

  // Filter chips: multi-select toggle (add/remove from selection)
  const handleCategoryToggle = useCallback((catId: number) => {
    setHighlightOnly(false);
    setOffset(0);
    setAccumulatedItems([]);
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }, []);

  const handleHighlightToggle = useCallback(() => {
    setSelectedCategories([]);
    setOffset(0);
    setAccumulatedItems([]);
    setHighlightOnly((prev) => !prev);
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedCategories([]);
    setHighlightOnly(false);
    setMinScore(0);
    setSearch("");
    setOffset(0);
    setAccumulatedItems([]);
  }, []);

  const handleUpvote = useCallback(
    (useCaseId: number) => {
      if (!isAuthenticated) {
        toast.error("Please sign in to upvote", {
          action: {
            label: "Sign In",
            onClick: () => { window.location.href = getLoginUrl(); },
          },
        });
        return;
      }
      toggleUpvote.mutate({ useCaseId });

    },
    [toggleUpvote, isAuthenticated]
  );

  // Notification count for logged-in users
  const unreadCountQuery = trpc.user.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const unreadCount = unreadCountQuery.data ?? 0;

  const items = accumulatedItems;
  const total = useCasesQuery.data?.total ?? 0;

  // Translation overlay for non-English locales
  const itemIds = useMemo(() => items.map((uc: any) => uc.id), [items]);
  const { getTranslated } = useTranslatedUseCases(itemIds);
  const hasMore = items.length < total && !useCasesQuery.isFetching;

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !useCasesQuery.isFetching) {
          setOffset((prev) => prev + limit);
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, useCasesQuery.isFetching, limit]);

  // Hide hero when searching or filtering
  const isFiltering = search.length > 0 || selectedCategories.length > 0 || highlightOnly || minScore > 0;

  // Hero stats
  const heroStats = useMemo(() => {
    return {
      total,
      categories: (categoriesQuery.data ?? []).length,
    };
  }, [total, categoriesQuery.data]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <WelcomePopup />
      {/* ─── Top Navigation ─── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="w-full px-4 sm:px-6 flex h-14 items-center gap-2 sm:gap-4">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Toggle sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>

          <Link href="/" className="flex items-center mr-auto" onClick={handleShowAll}>
            <ManusLogo size="sm" title={t("nav.useCaseLibrary")} />
          </Link>

          {/* Language Selector */}
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="w-auto gap-1.5 border-0 bg-transparent shadow-none h-8 px-2 text-xs">
              <Globe size={14} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>

          {/* Admin link */}
          {user?.role === "admin" && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                <Shield size={14} />
                {t("nav.admin")}
              </Button>
            </Link>
          )}

          {/* Team Plan CTA - desktop only */}
          <a
            href="https://manus.im/team"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Users size={14} />
              Team Plan
            </Button>
          </a>

          {/* Submit */}
          <Link href="/submit">
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus size={14} />
              <span className="hidden sm:inline">{t("nav.submit")}</span>
            </Button>
          </Link>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/my-submissions">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="relative p-2 hover:bg-accent rounded-md transition-colors">
                      <Bell size={16} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications & My Submissions</TooltipContent>
                </Tooltip>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex items-center gap-1.5 p-1.5 hover:bg-accent rounded-full transition-colors">
                    {hasProfile && profileQuery.data?.avatarUrl ? (
                      <img src={profileQuery.data.avatarUrl} alt={user?.name || ""} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <UserCircle size={18} className="text-muted-foreground" />
                    )}
                    {!hasProfile && (
                      <span className="absolute top-0.5 left-5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
                    )}
                    <ChevronDown size={12} className="text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email || ""}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hasProfile && profileQuery.data?.username ? (
                    <DropdownMenuItem onClick={() => navigate(`/profile/${profileQuery.data!.username}`)}>
                      <User size={14} className="mr-2" />
                      {t("nav.myProfile")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate("/profile/setup")}>
                      <User size={14} className="mr-2" />
                      Set Up Profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/my-submissions")}>
                    <FileText size={14} className="mr-2" />
                    {t("nav.mySubmissions")}
                  </DropdownMenuItem>
                  {hasProfile && (
                    <DropdownMenuItem onClick={() => navigate("/profile/setup")}>
                      <Settings size={14} className="mr-2" />
                      {t("nav.editProfile")}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); }} className="text-destructive focus:text-destructive">
                    <LogOut size={14} className="mr-2" />
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <a href={getLoginUrl()}>
              <Button variant="outline" size="sm" className="text-xs">
                {t("nav.login")}
              </Button>
            </a>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r bg-sidebar text-sidebar-foreground overflow-hidden shrink-0 hidden lg:block"
              style={{ height: 'calc(100vh - 3.5rem)' }}
            >
              <ScrollArea className="h-[calc(100vh-3.5rem)]">
                <div className="p-4 space-y-5">
                  {/* Toggle sidebar */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors"
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose size={16} />
                  </button>

                  {/* All Use Cases */}
                  <button
                    onClick={handleShowAll}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between ${
                      !highlightOnly && selectedCategories.length === 0
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <span>{t("sidebar.allUseCases")}</span>
                    <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">
                      {globalTotal}
                    </span>
                  </button>

                  {/* Only Possible with Manus */}
                  <button
                    onClick={handleHighlightToggle}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      highlightOnly
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "hover:bg-primary/5 text-primary/80"
                    }`}
                  >
                    <Sparkles size={15} />
                    <span className="flex-1">{t("sidebar.highlights")}</span>
                  </button>

                  <Separator />

                  {/* Job Function / Industry */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {t("sidebar.byJobFunction")}
                    </h3>
                    <div className="space-y-0.5">
                      {jobFunctionCats.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleSidebarCategorySelect(cat.id)}
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
                          onClick={() => handleSidebarCategorySelect(cat.id)}
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

                  {/* Contributor Leaderboard */}
                  <LeaderboardWidget />

                  <Separator />

                  {/* Learn More */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      {t("sidebar.learnMore")}
                    </h3>
                    <div className="space-y-0.5">
                      <Link href="/about">
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
                          <Info size={13} />
                          {t("sidebar.aboutPortal")}
                        </span>
                      </Link>
                      {LEARN_MORE_LINKS.filter((link) => link.url !== "/api-docs" || user?.role === "admin").map((link) => {
                        const IconComp = link.icon === "video" ? Video : link.icon === "graduation" ? GraduationCap : link.icon === "shield" ? Shield : BookOpen;
                        if (link.url === "__demo__") {
                          return (
                            <button
                              key={link.nameKey}
                              onClick={() => setShowDemoVideo(true)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm w-full text-left transition-colors ${
                                showDemoVideo
                                  ? "bg-sidebar-accent text-foreground font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                              }`}
                            >
                              <IconComp size={13} />
                              {t(link.nameKey)}
                            </button>
                          );
                        }
                        return (
                          <a
                            key={link.nameKey}
                            href={link.url}
                            target={link.url.startsWith("/") ? undefined : "_blank"}
                            rel={link.url.startsWith("/") ? undefined : "noopener noreferrer"}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                          >
                            <IconComp size={13} />
                            {t(link.nameKey)}
                          </a>
                        );
                      })}
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

                  {/* Made with Manus badge */}
                  <div className="pt-2 px-1">
                    <MadeWithManusBadge />
                  </div>
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar collapsed toggle */}
        {!sidebarOpen && (
          <div className="hidden lg:flex border-r bg-sidebar items-start pt-4 px-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-sidebar-accent rounded-md transition-colors"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}

        {/* ─── Main Content ─── */}
        <main id="main-content" className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 3.5rem)' }} tabIndex={-1}>
          {/* ─── Product Demo Walkthrough Panel ─── */}
          {showDemoVideo && (
            <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video size={20} className="text-primary" />
                  <h2 className="font-serif text-xl md:text-2xl font-bold">{t("sidebar.productDemo")}</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDemoVideo(false)}
                >
                  <X size={14} className="mr-1" />
                  Close
                </Button>
              </div>
              <div className="relative w-full rounded-xl overflow-hidden border shadow-lg" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/3mdNmNLcWYQ?si=ImZldzNHddnfJNgv"
                  title={t("sidebar.productDemo")}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <a
                  href="https://academy.manus.im/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GraduationCap size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{t("sidebar.manusAcademy")}</div>
                    <div className="text-xs text-muted-foreground">{t("about.manusAcademyDesc")}</div>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-muted-foreground shrink-0" />
                </a>
                <a
                  href="https://trust.manus.im/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm group-hover:text-primary transition-colors">{t("sidebar.trustCenter")}</div>
                    <div className="text-xs text-muted-foreground">{t("about.trustCenterDesc")}</div>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-muted-foreground shrink-0" />
                </a>
              </div>
            </div>
          )}

          {!showDemoVideo && (<>
          {/* ─── Hero Section with Search ─── */}
          <div className="relative overflow-hidden border-b bg-gradient-to-br from-background via-background to-accent/30">
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }} />

            <div className="relative p-6 md:p-8 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
                {/* Left: Text content */}
                <div className="flex-1 space-y-3">
                  <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                    {t("hero.title1")}
                    <br />
                    <span className="text-primary/70">{t("hero.title2")}</span>
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed">
                    {t("hero.desc")}
                  </p>
                </div>

                {/* Right: Animated stats */}
                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                      <Zap size={18} className="text-primary" />
                    </div>
                    <div className="font-serif text-xl md:text-2xl font-bold tabular-nums">
                      <AnimatedCounter target={globalTotal} />
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">{t("hero.useCases")}</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                      <TrendingUp size={18} className="text-primary" />
                    </div>
                    <div className="font-serif text-xl md:text-2xl font-bold tabular-nums">
                      <AnimatedCounter target={heroStats.categories} />
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">{t("hero.categories")}</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-accent flex items-center justify-center mb-1">
                      <Users size={18} className="text-accent-foreground" />
                    </div>
                    <div className="font-serif text-xl md:text-2xl font-bold tabular-nums">
                      <AnimatedCounter target={5} />
                    </div>
                    <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">{t("hero.languages")}</div>
                  </div>
                </div>
              </div>

              {/* Search Bar in Hero */}
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder={t("gallery.search")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOffset(0);
                      setAccumulatedItems([]);
                      
                    }}
                    className="pl-9 bg-card h-11 text-base"
                  />
                </div>

                {/* Category Filter Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 h-11 min-w-[140px] justify-between">
                      <Filter size={15} />
                      <span className="truncate">
                        {selectedCategories.length === 0
                          ? t("gallery.allCategories")
                          : selectedCategories.length === 1
                            ? (t(`cat.${categoriesQuery.data?.find(c => c.id === selectedCategories[0])?.slug}` as any) || categoriesQuery.data?.find(c => c.id === selectedCategories[0])?.name || "1 filter")
                            : `${selectedCategories.length} filters`
                        }
                      </span>
                      <ChevronDown size={14} className="opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[480px] p-0" align="start">
                    <div className="p-2 border-b">
                      <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-medium">{t("gallery.filterByCategory")}</span>
                        {selectedCategories.length > 0 && (
                          <button
                            onClick={() => { setSelectedCategories([]); setOffset(0); setAccumulatedItems([]); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x">
                      {/* Left column: Job Function */}
                      <div className="p-2 max-h-[360px] overflow-y-auto">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                          {t("sidebar.byJobFunction")}
                        </div>
                        {jobFunctionCats.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryToggle(cat.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              selectedCategories.includes(cat.id)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            }`}>
                              {selectedCategories.includes(cat.id) && <Check size={12} />}
                            </div>
                            <span className="truncate">{t(`cat.${cat.slug}` as any) || cat.name}</span>
                          </button>
                        ))}
                      </div>
                      {/* Right column: Feature */}
                      <div className="p-2 max-h-[360px] overflow-y-auto">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                          {t("sidebar.byFeature")}
                        </div>
                        {featureCats.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryToggle(cat.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              selectedCategories.includes(cat.id)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            }`}>
                              {selectedCategories.includes(cat.id) && <Check size={12} />}
                            </div>
                            <span className="truncate">{t(`cat.${cat.slug}` as any) || cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  className={`gap-2 h-11 ${highlightOnly ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
                  onClick={handleHighlightToggle}
                >
                  <Sparkles size={15} />
                  <span className="hidden sm:inline">{t("hero.highlightsCta")}</span>
                  <span className="sm:hidden">{t("hero.highlightsCtaShort")}</span>
                </Button>

                {/* AI Chatbot */}
                <UseCaseChatbot />
              </div>
            </div>
          </div>

          {/* ─── Featured Use Case of the Week ─── */}
          {!isFiltering && (
            <FeaturedSection onCardClick={setModalSlug} />
          )}

          {/* ─── Trending This Week ─── */}
          {!isFiltering && (
            <TrendingSection onCardClick={setModalSlug} />
          )}

          {/* ─── Curated Collections ─── */}
          {!isFiltering && (
            <CollectionsSection onCardClick={setModalSlug} />
          )}

          <div className="p-6 max-w-7xl mx-auto">
            {/* Sort & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 flex items-center">
                <h2 className="font-serif font-bold text-lg">{isFiltering ? t('gallery.searchResults') : t('gallery.allUseCases')}</h2>
              </div>
              <Select value={sort} onValueChange={(v) => { setSort(v as any); setOffset(0); setAccumulatedItems([]); }}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">{t("gallery.sortScore")}</SelectItem>
                  <SelectItem value="popular">{t("gallery.sortPopular")}</SelectItem>
                  <SelectItem value="newest">{t("gallery.sortNewest")}</SelectItem>
                  <SelectItem value="views">{t("gallery.sortViews")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(minScore)} onValueChange={(v) => { setMinScore(Number(v)); setOffset(0); setAccumulatedItems([]); }}>
                <SelectTrigger className="w-[160px] bg-card">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span>{minScore > 0 ? `${minScore}+ ${t("gallery.scoreAbove")}` : t("gallery.allScores")}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t("gallery.allScores")}</SelectItem>
                  <SelectItem value="3">3.0+ {t("gallery.scoreAbove")}</SelectItem>
                  <SelectItem value="3.5">3.5+ {t("gallery.scoreAbove")}</SelectItem>
                  <SelectItem value="4">4.0+ {t("gallery.scoreAbove")}</SelectItem>
                  <SelectItem value="4.5">4.5+ {t("gallery.scoreAbove")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {(selectedCategories.length > 0 || highlightOnly || minScore > 0 || search) && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {search && (
                  <Badge variant="secondary" className="gap-1">
                    <Search size={12} />
                    "{search}"
                    <button onClick={() => { setSearch(""); setOffset(0); setAccumulatedItems([]); }} className="ml-1 hover:opacity-70">&times;</button>
                  </Badge>
                )}
                {minScore > 0 && (
                  <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                    <Star size={12} className="fill-current" />
                    {minScore}+ {t("gallery.scoreAbove")}
                    <button onClick={() => { setMinScore(0); setOffset(0); setAccumulatedItems([]); }} className="ml-1 hover:opacity-70">&times;</button>
                  </Badge>
                )}
                {highlightOnly && (
                  <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                    <Sparkles size={12} />
                    {t("sidebar.highlights")}
                    <button onClick={handleHighlightToggle} className="ml-1 hover:opacity-70">&times;</button>
                  </Badge>
                )}
                {selectedCategories.map((catId) => {
                  const cat = categoriesQuery.data?.find((c) => c.id === catId);
                  return cat ? (
                    <Badge key={catId} variant="secondary" className="gap-1">
                      {t(`cat.${cat.slug}` as any) || cat.name}
                      <button onClick={() => handleCategoryToggle(catId)} className="ml-1 hover:opacity-70">&times;</button>
                    </Badge>
                  ) : null;
                })}
                <button onClick={handleShowAll} className="text-xs text-muted-foreground hover:text-foreground underline">
                  {t("gallery.clearAll")}
                </button>
              </div>
            )}

            {/* Result count */}
            {!useCasesQuery.isLoading && items.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                {t("gallery.showingOf").replace("{0}", String(items.length)).replace("{1}", String(total))}
              </p>
            )}

            {/* Gallery Grid */}
            {useCasesQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border overflow-hidden">
                    <div className="aspect-[16/10] bg-muted animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-full animate-pulse" />
                      <div className="flex gap-1.5">
                        <div className="h-5 bg-muted rounded-full w-16 animate-pulse" />
                        <div className="h-5 bg-muted rounded-full w-12 animate-pulse" />
                      </div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Search size={28} className="text-muted-foreground/40" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">{t("gallery.noResults")}</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t("gallery.noResultsDesc")}</p>
                <Link href="/submit">
                  <Button className="gap-2">
                    <Plus size={16} />
                    {t("gallery.beFirst")}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((uc, index) => (
                    <motion.div
                      key={uc.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index < 12 ? index * 0.03 : 0 }}
                    >
                      <div className="group bg-card rounded-xl border hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer"
                           onClick={() => setModalSlug(uc.slug)}>
                        {/* Thumbnail */}
                        <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                          {uc.screenshots[0] ? (
                            <BlurhashImage
                              src={uc.screenshots[0].url}
                              blurhash={uc.screenshots[0].blurhash}
                              alt={uc.title}
                              className="w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-accent/20">
                              <ManusGlyph size={40} className="opacity-20" />
                            </div>
                          )}
                          {uc.isHighlight && (
                            <div className="absolute top-2.5 left-2.5">
                              <Badge className="bg-primary text-primary-foreground border-0 gap-1 text-[10px] shadow-md backdrop-blur-sm">
                                <Sparkles size={10} />
                                {t("detail.onlyManus")}
                              </Badge>
                            </div>
                          )}
                          {uc.aiScore && Number(uc.aiScore.overall) > 0 && (
                            <div className="absolute top-2.5 right-2.5">
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-md backdrop-blur-sm ${
                                Number(uc.aiScore.overall) >= 4 ? "bg-emerald-500/90 text-white" :
                                Number(uc.aiScore.overall) >= 3 ? "bg-amber-500/90 text-white" :
                                "bg-zinc-500/90 text-white"
                              }`}>
                                <Star size={10} className="fill-current" />
                                {Number(uc.aiScore.overall).toFixed(1)}
                              </div>
                            </div>
                          )}
                          {/* Admin edit button */}
                          {user?.role === "admin" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingSlug(uc.slug); }}
                              className="absolute bottom-2.5 right-2.5 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
                              title="Edit use case"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-serif font-bold text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                            {getTranslated(uc.id, { title: uc.title, description: uc.description ?? "" }).title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                            {stripMarkdown(getTranslated(uc.id, { title: uc.title, description: uc.description ?? "" }).description)}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {uc.categories.slice(0, 3).map((cat: any) => (
                              <Badge key={cat.id} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                {t(`cat.${cat.slug}` as any) || cat.name}
                              </Badge>
                            ))}
                            {uc.categories.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                +{uc.categories.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <div className="flex items-center gap-3 pt-2">
                              {uc.submitterName && (
                                <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                                  <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 overflow-hidden">
                                    {uc.submitterAvatar ? (
                                      <img src={uc.submitterAvatar} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      uc.submitterName.charAt(0).toUpperCase()
                                    )}
                                  </span>
                                  {uc.submitterUsername ? (
                                    <Link href={`/profile/${uc.submitterUsername}`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="hover:text-primary hover:underline truncate">
                                      {uc.submitterName}
                                    </Link>
                                  ) : (
                                    <span className="truncate">{uc.submitterName}</span>
                                  )}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Eye size={12} />
                                {uc.viewCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-1">
                                {/* Shortcut buttons: show deliverable only if both exist, otherwise show whichever is available */}
                                {uc.deliverableUrl ? (
                                  <a
                                    href={uc.deliverableUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary hover:scale-105 transition-all duration-200"
                                    title="See deliverable"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                ) : uc.sessionReplayUrl ? (
                                  <a
                                    href={uc.sessionReplayUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-primary hover:scale-105 transition-all duration-200"
                                    title="See replay"
                                  >
                                    <Play size={13} />
                                  </a>
                                ) : null}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpvote(uc.id);
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                                  uc.hasUpvoted
                                    ? "bg-primary/10 text-primary font-semibold scale-105"
                                    : "hover:bg-accent hover:scale-105"
                                }`}
                              >
                                <motion.div
                                  whileTap={{ scale: 1.3, rotate: -10 }}
                                  transition={{ type: "spring", stiffness: 400 }}
                                >
                                  <Heart size={13} className={uc.hasUpvoted ? "fill-current text-primary" : ""} />
                                </motion.div>
                                <span className="tabular-nums">{uc.upvoteCount}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-8">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      {t("common.loading")}
                    </div>
                  </div>
                )}

                {/* End of list */}
                {!hasMore && items.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">
                      {t("gallery.seenAll").replace("{0}", String(total))}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          </>)}

          {/* ─── Footer: UGC Disclaimer & Copyright ─── */}
          <footer className="border-t bg-muted/30 px-6 py-6 mt-8">
            <div className="max-w-7xl mx-auto space-y-2 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("footer.ugcDisclaimer")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("footer.copyright")}{" "}
                <a
                  href="https://manus.im/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  {t("footer.terms")}
                </a>
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* Use Case Detail Modal */}
      <UseCaseModal
        slug={modalSlug}
        onClose={() => setModalSlug(null)}
        slugList={items.map((i: any) => i.slug)}
        onNavigate={setModalSlug}
      />

      {/* Admin Edit Dialog */}
      {user?.role === "admin" && (
        <AdminEditDialog
          slug={editingSlug}
          onClose={() => setEditingSlug(null)}
          onSaved={() => setEditingSlug(null)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        categories={categoriesQuery.data ?? []}
        selectedCategories={selectedCategories}
        highlightOnly={highlightOnly}
        onCategoryToggle={handleSidebarCategorySelect}
        onHighlightToggle={handleHighlightToggle}
        onShowAll={handleShowAll}
      />
    </div>
  );
}
