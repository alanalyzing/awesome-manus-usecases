import { useAuth } from "@/_core/hooks/useAuth";
import { stripMarkdown } from "@/components/MarkdownContent";
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
  ArrowUp,
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
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { LOCALES, type Locale } from "@/lib/i18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ManusLogo, ManusGlyph, MadeWithManusBadge } from "@/components/ManusLogo";
import { MobileSidebar } from "@/components/MobileSidebar";
import { UseCaseModal } from "@/components/UseCaseModal";

/** Trending This Week section — horizontal scrollable strip */
function TrendingSection({ onCardClick }: { onCardClick: (slug: string) => void }) {
  const { t } = useI18n();
  const trendingQuery = trpc.useCases.trending.useQuery({ limit: 6 });
  const items = trendingQuery.data ?? [];

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
                    <img
                      src={uc.screenshots[0].url}
                      alt={uc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
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
                </div>
                <div className="p-3">
                  <h3 className="font-serif font-bold text-xs leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {uc.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ArrowUp size={10} />
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
              <span className="tabular-nums">{entry.approvedCount} use case{entry.approvedCount !== 1 ? "s" : ""}</span>
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

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [sort, setSort] = useState<"popular" | "newest" | "views" | "score">("newest");
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<any[]>([]);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [showHero, setShowHero] = useState(true);

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

  const useCasesQuery = trpc.useCases.list.useQuery({
    search: search || undefined,
    categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    highlightOnly: highlightOnly || undefined,
    sort,
    limit,
    offset,
  });

  // Accumulate items for infinite scroll
  useEffect(() => {
    if (!useCasesQuery.data) return;
    if (offset === 0) {
      setAccumulatedItems(useCasesQuery.data.items);
    } else {
      setAccumulatedItems((prev) => {
        const existingIds = new Set(prev.map((item: any) => item.id));
        const newItems = useCasesQuery.data.items.filter((item: any) => !existingIds.has(item.id));
        return [...prev, ...newItems];
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

  const handleCategoryToggle = useCallback((catId: number) => {
    setHighlightOnly(false);
    setOffset(0);
    setAccumulatedItems([]);
    setShowHero(false);
    setSelectedCategories((prev) =>
      prev.includes(catId) ? [] : [catId]
    );
  }, []);

  const handleHighlightToggle = useCallback(() => {
    setSelectedCategories([]);
    setOffset(0);
    setAccumulatedItems([]);
    setShowHero(false);
    setHighlightOnly((prev) => !prev);
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedCategories([]);
    setHighlightOnly(false);
    setOffset(0);
    setAccumulatedItems([]);
    setShowHero(true);
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
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, useCasesQuery.isFetching, limit]);

  // Hide hero when searching
  useEffect(() => {
    if (search) setShowHero(false);
  }, [search]);

  // Hero stats
  const heroStats = useMemo(() => {
    return {
      total,
      categories: (categoriesQuery.data ?? []).length,
    };
  }, [total, categoriesQuery.data]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
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

          <Link href="/" className="flex items-center mr-auto" onClick={() => setShowHero(true)}>
            <ManusLogo size="sm" />
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
              {!hasProfile && !profileQuery.isLoading && (
                <Link href="/profile/setup">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-2 hover:bg-accent rounded-md transition-colors text-primary">
                        <UserCircle size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Set up your profile</TooltipContent>
                  </Tooltip>
                </Link>
              )}
              {hasProfile && profileQuery.data?.username ? (
                <Link href={`/profile/${profileQuery.data.username}`}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1.5 hover:bg-accent rounded-full transition-colors">
                        {profileQuery.data.avatarUrl ? (
                          <img src={profileQuery.data.avatarUrl} alt={user?.name || ""} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <UserCircle size={18} className="text-muted-foreground" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{user?.name}</TooltipContent>
                  </Tooltip>
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground hidden md:inline">{user?.name}</span>
              )}
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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ─── Sidebar ─── */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r bg-sidebar text-sidebar-foreground overflow-hidden shrink-0 hidden lg:block h-full"
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
                          onClick={() => handleCategoryToggle(cat.id)}
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
                          onClick={() => handleCategoryToggle(cat.id)}
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
        <main id="main-content" className="flex-1 overflow-auto h-full" tabIndex={-1}>
          {/* ─── Hero Section ─── */}
          <AnimatePresence>
            {showHero && !search && selectedCategories.length === 0 && !highlightOnly && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative overflow-hidden border-b bg-gradient-to-br from-background via-background to-accent/30">
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: '24px 24px',
                  }} />

                  <div className="relative p-6 md:p-10 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
                      {/* Left: Text content */}
                      <div className="flex-1 space-y-4">
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.5 }}
                        >
                          <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                            {t("hero.title1")}
                            <br />
                            <span className="text-primary/70">{t("hero.title2")}</span>
                          </h1>
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed"
                        >
                          {t("hero.desc")}
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          className="flex gap-3 pt-1"
                        >
                          <Link href="/submit">
                            <Button className="gap-2 shadow-sm">
                              <Plus size={15} />
                              {t("hero.submitCta")}
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleHighlightToggle}
                          >
                            <Sparkles size={15} />
                            <span className="hidden sm:inline">{t("hero.highlightsCta")}</span>
                            <span className="sm:hidden">{t("hero.highlightsCtaShort")}</span>
                          </Button>
                        </motion.div>
                      </div>

                      {/* Right: Animated stats */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="grid grid-cols-3 gap-4 md:gap-6"
                      >
                        <div className="text-center space-y-1">
                          <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                            <Zap size={18} className="text-primary" />
                          </div>
                          <div className="font-serif text-xl md:text-2xl font-bold tabular-nums">
                            <AnimatedCounter target={heroStats.total} />
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
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Trending This Week ─── */}
          {showHero && !search && selectedCategories.length === 0 && !highlightOnly && (
            <TrendingSection onCardClick={setModalSlug} />
          )}

          <div className="p-6 max-w-7xl mx-auto">
            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={t("gallery.search")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                  }}
                  className="pl-9 bg-card"
                />
              </div>
              <Select value={sort} onValueChange={(v) => { setSort(v as any); setOffset(0); }}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">{t("gallery.sortPopular")}</SelectItem>
                  <SelectItem value="newest">{t("gallery.sortNewest")}</SelectItem>
                  <SelectItem value="views">{t("gallery.sortViews")}</SelectItem>
                   <SelectItem value="score">Top Rated</SelectItem>
                 </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {(selectedCategories.length > 0 || highlightOnly) && (
              <div className="flex flex-wrap gap-2 mb-4">
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
                  Clear all
                </button>
              </div>
            )}

            {/* Result count */}
            {!useCasesQuery.isLoading && items.length > 0 && (
              <p className="text-xs text-muted-foreground mb-4">
                Showing {items.length} of {total} use case{total !== 1 ? "s" : ""}
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
                      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.3) }}
                    >
                      <div className="group bg-card rounded-xl border hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden cursor-pointer"
                           onClick={() => setModalSlug(uc.slug)}>
                        {/* Thumbnail */}
                        <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                          {uc.screenshots[0] ? (
                            <img
                              src={uc.screenshots[0].url}
                              alt={uc.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              loading="lazy"
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
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-serif font-bold text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-200">
                            {uc.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                            {stripMarkdown(uc.description ?? "")}
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
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(uc.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpvote(uc.id);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all duration-200 mt-2 ${
                                uc.hasUpvoted
                                  ? "bg-primary/10 text-primary font-semibold scale-105"
                                  : "hover:bg-accent hover:scale-105"
                              }`}
                            >
                              <motion.div
                                whileTap={{ scale: 1.3, rotate: -10 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <ArrowUp size={13} className={uc.hasUpvoted ? "text-primary" : ""} />
                              </motion.div>
                              <span className="tabular-nums">{uc.upvoteCount}</span>
                            </button>
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
                      Loading more...
                    </div>
                  </div>
                )}

                {/* End of list */}
                {!hasMore && items.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">
                      You've seen all {total} use case{total !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Use Case Detail Modal */}
      <UseCaseModal slug={modalSlug} onClose={() => setModalSlug(null)} />

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        categories={categoriesQuery.data ?? []}
        selectedCategories={selectedCategories}
        highlightOnly={highlightOnly}
        onCategoryToggle={handleCategoryToggle}
        onHighlightToggle={handleHighlightToggle}
        onShowAll={handleShowAll}
      />
    </div>
  );
}
