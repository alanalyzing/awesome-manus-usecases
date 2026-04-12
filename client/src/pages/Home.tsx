import { useAuth } from "@/_core/hooks/useAuth";
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
  ChevronUp,
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
  FileText,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { LOCALES, type Locale } from "@/lib/i18n";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ManusLogo, MadeWithManusBadge } from "@/components/ManusLogo";
import { MobileSidebar } from "@/components/MobileSidebar";
import { UseCaseModal } from "@/components/UseCaseModal";

const SOCIAL_LINKS = [
  { name: "LinkedIn", url: "https://www.linkedin.com/company/maboroshiinc/" },
  { name: "X / Twitter", url: "https://x.com/maboroshi_inc" },
  { name: "YouTube", url: "https://www.youtube.com/@manus_im" },
  { name: "Instagram", url: "https://www.instagram.com/manus_im/" },
  { name: "TikTok", url: "https://www.tiktok.com/@manus_im" },
];

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
  const [sort, setSort] = useState<"popular" | "newest" | "views">("newest");
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [modalSlug, setModalSlug] = useState<string | null>(null);

  // Queries
  const categoriesQuery = trpc.categories.list.useQuery();
  const useCasesQuery = trpc.useCases.list.useQuery({
    search: search || undefined,
    categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    highlightOnly: highlightOnly || undefined,
    sort,
    limit,
    offset,
  });

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
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }, []);

  const handleHighlightToggle = useCallback(() => {
    setSelectedCategories([]);
    setOffset(0);
    setHighlightOnly((prev) => !prev);
  }, []);

  const handleShowAll = useCallback(() => {
    setSelectedCategories([]);
    setHighlightOnly(false);
    setOffset(0);
  }, []);

  const handleUpvote = useCallback(
    (useCaseId: number) => {
      toggleUpvote.mutate({ useCaseId });
    },
    [toggleUpvote]
  );

  // Notification count for logged-in users
  const unreadCountQuery = trpc.user.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const unreadCount = unreadCountQuery.data ?? 0;

  const items = useCasesQuery.data?.items ?? [];
  const total = useCasesQuery.data?.total ?? 0;
  const hasMore = offset + limit < total;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ─── Top Navigation ─── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center gap-4">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Toggle sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            <ManusLogo size="sm" />
            <span className="text-muted-foreground font-sans font-normal text-sm hidden sm:inline">
              {t("nav.useCaseLibrary")}
            </span>
          </Link>

          <div className="flex-1" />

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
              {/* Notifications Bell */}
              <Link href="/my-submissions">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="relative p-2 hover:bg-accent rounded-md transition-colors">
                      <Bell size={16} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications & My Submissions</TooltipContent>
                </Tooltip>
              </Link>
              <span className="text-xs text-muted-foreground hidden md:inline">{user?.name}</span>
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

      <div className="flex flex-1">
        {/* ─── Sidebar ─── */}
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r bg-sidebar text-sidebar-foreground overflow-hidden shrink-0 hidden lg:block"
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
                    onClick={handleHighlightToggle}
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
        <main id="main-content" className="flex-1 overflow-auto" tabIndex={-1}>
          <div className="p-6 max-w-7xl mx-auto">
            {/* Search & Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={t("gallery.search")}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
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
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {(selectedCategories.length > 0 || highlightOnly) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {highlightOnly && (
                  <Badge variant="secondary" className="gap-1 bg-manus-highlight/15 text-manus-highlight border-manus-highlight/30">
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

            {/* Gallery Grid */}
            {useCasesQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border animate-pulse">
                    <div className="aspect-[16/10] bg-muted rounded-t-xl" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4 opacity-30">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-2">{t("gallery.noResults")}</h3>
                <p className="text-muted-foreground mb-6">{t("gallery.noResultsDesc")}</p>
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
                  {items.map((uc) => (
                    <motion.div
                      key={uc.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="group bg-card rounded-xl border hover:shadow-lg transition-all duration-200 overflow-hidden">
                        {/* Thumbnail */}
                        <button onClick={() => setModalSlug(uc.slug)} className="w-full text-left">
                          <div className="aspect-[16/10] bg-muted overflow-hidden relative">
                            {uc.screenshots[0] ? (
                              <img
                                src={uc.screenshots[0].url}
                                alt={uc.title}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                <span className="font-serif text-2xl">M</span>
                              </div>
                            )}
                            {uc.isHighlight && (
                              <div className="absolute top-2 left-2">
                                <Badge className="bg-manus-highlight text-white border-0 gap-1 text-[10px] shadow-sm">
                                  <Sparkles size={10} />
                                  {t("detail.onlyManus")}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Content */}
                        <div className="p-4">
                          <button onClick={() => setModalSlug(uc.slug)} className="text-left w-full">
                            <h3 className="font-serif font-bold text-sm leading-snug mb-1.5 line-clamp-2 group-hover:text-primary/80 transition-colors">
                              {uc.title}
                            </h3>
                          </button>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {uc.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {uc.categories.slice(0, 3).map((cat) => (
                              <Badge key={cat.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {t(`cat.${cat.slug}` as any) || cat.name}
                              </Badge>
                            ))}
                            {uc.categories.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                +{uc.categories.length - 3}
                              </Badge>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-3">
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
                              onClick={(e) => { e.preventDefault(); handleUpvote(uc.id); }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                                uc.hasUpvoted
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-accent"
                              }`}
                            >
                              <ArrowUp size={13} className={uc.hasUpvoted ? "text-primary" : ""} />
                              {uc.upvoteCount}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setOffset((prev) => prev + limit)}
                      className="gap-2"
                    >
                      {t("gallery.loadMore")}
                    </Button>
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
