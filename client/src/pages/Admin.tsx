import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Eye,
  ArrowUp,
  FileText,
  Loader2,
  BarChart3,
  Users,
  Activity,
  Brain,
  TrendingUp,
  UserPlus,
  UserMinus,
  Star,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("pending");
  const [adminTab, setAdminTab] = useState<"moderation" | "analytics" | "users" | "activity">("moderation");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [highlightToggle, setHighlightToggle] = useState(false);
  const [editCategoryIds, setEditCategoryIds] = useState<number[]>([]);
  const [scanningIds, setScanningIds] = useState<Set<number>>(new Set());
  const [activityFilter, setActivityFilter] = useState<string | undefined>(undefined);

  const isAdmin = user?.role === "admin";

  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin });
  const submissionsQuery = trpc.admin.submissions.useQuery(
    { status: activeTab === "all" ? undefined : (activeTab as any) },
    { enabled: isAdmin }
  );
  const categoriesQuery = trpc.categories.list.useQuery();
  const trendsQuery = trpc.admin.submissionTrends.useQuery({ days: 30 }, { enabled: isAdmin });
  const usersQuery = trpc.admin.listUsers.useQuery(undefined, { enabled: isAdmin });
  const activityQuery = trpc.admin.activityLog.useQuery(
    { limit: 50, action: activityFilter },
    { enabled: isAdmin }
  );

  const approveMutation = trpc.admin.approve.useMutation({
    onSuccess: () => {
      toast.success("Use case approved — submitter notified");
      submissionsQuery.refetch();
      statsQuery.refetch();
      activityQuery.refetch();
      setApproveDialogOpen(false);
    },
  });

  const rejectMutation = trpc.admin.reject.useMutation({
    onSuccess: () => {
      toast.success("Use case rejected — submitter notified");
      submissionsQuery.refetch();
      statsQuery.refetch();
      activityQuery.refetch();
      setRejectDialogOpen(false);
      setRejectReason("");
    },
  });

  const updateMutation = trpc.admin.update.useMutation({
    onSuccess: () => {
      toast.success("Use case updated");
      submissionsQuery.refetch();
    },
  });

  const promoteMutation = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("User promoted to admin");
      usersQuery.refetch();
      activityQuery.refetch();
    },
  });

  const demoteMutation = trpc.admin.demoteToUser.useMutation({
    onSuccess: () => {
      toast.success("Admin demoted to user");
      usersQuery.refetch();
      activityQuery.refetch();
    },
  });

  const aiScanMutation = trpc.admin.aiScan.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`AI Score: ${data.overall}/5.0`);
      setScanningIds((prev) => { const next = new Set(prev); next.delete(variables.useCaseId); return next; });
      submissionsQuery.refetch();
    },
    onError: (err, variables) => {
      toast.error("AI scan failed: " + err.message);
      setScanningIds((prev) => { const next = new Set(prev); next.delete(variables.useCaseId); return next; });
    },
  });

  const handleApproveClick = useCallback(
    (id: number, currentCatIds: number[], isHighlight: boolean) => {
      setSelectedId(id);
      setEditCategoryIds(currentCatIds);
      setHighlightToggle(isHighlight);
      setApproveDialogOpen(true);
    },
    []
  );

  const handleRejectClick = useCallback((id: number) => {
    setSelectedId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const confirmApprove = useCallback(() => {
    if (selectedId === null) return;
    approveMutation.mutate({
      id: selectedId,
      categoryIds: editCategoryIds,
      isHighlight: highlightToggle,
    });
  }, [selectedId, editCategoryIds, highlightToggle, approveMutation]);

  const confirmReject = useCallback(() => {
    if (selectedId === null || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    rejectMutation.mutate({ id: selectedId, reason: rejectReason.trim() });
  }, [selectedId, rejectReason, rejectMutation]);

  const handleAiScan = useCallback((useCaseId: number) => {
    setScanningIds((prev) => new Set(prev).add(useCaseId));
    aiScanMutation.mutate({ useCaseId });
  }, [aiScanMutation]);

  // Derived data
  const adminUsers = useMemo(() => (usersQuery.data ?? []).filter(u => u.role === "admin"), [usersQuery.data]);
  const regularUsers = useMemo(() => (usersQuery.data ?? []).filter(u => u.role === "user"), [usersQuery.data]);

  const actionLabels: Record<string, string> = {
    approve: "Approved",
    reject: "Rejected",
    edit: "Edited",
    promote_admin: "Promoted to Admin",
    demote_admin: "Demoted to User",
    ai_scan: "AI Scanned",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={16} />
              Back to Gallery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const stats = statsQuery.data;
  const submissions = submissionsQuery.data?.items ?? [];
  const trends = trendsQuery.data ?? [];
  const activities = activityQuery.data?.items ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft size={14} />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <h1 className="font-serif font-bold text-sm">{t("admin.title")}</h1>
          </div>
          <div className="flex-1" />
          {/* Admin section tabs */}
          <div className="flex gap-1">
            {(["moderation", "analytics", "users", "activity"] as const).map((tab) => (
              <Button
                key={tab}
                variant={adminTab === tab ? "default" : "ghost"}
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setAdminTab(tab)}
              >
                {tab === "moderation" && <FileText size={13} />}
                {tab === "analytics" && <TrendingUp size={13} />}
                {tab === "users" && <Users size={13} />}
                {tab === "activity" && <Activity size={13} />}
                <span className="hidden sm:inline capitalize">{tab}</span>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ═══════════════════════════════════════════════════════════════
            MODERATION TAB
            ═══════════════════════════════════════════════════════════════ */}
        {adminTab === "moderation" && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("admin.totalSubmissions")}</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalSubmissions}</div>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-yellow-600">{stats.pendingCount} pending</span>
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("admin.approved")}</div>
                  <div className="text-2xl font-bold font-serif text-green-600">{stats.approvedCount}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.totalSubmissions > 0
                      ? `${Math.round((stats.approvedCount / stats.totalSubmissions) * 100)}% rate`
                      : "—"}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("admin.totalUpvotes")}</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalUpvotes ?? 0}</div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t("admin.totalViews")}</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalViews ?? 0}</div>
                </div>
              </div>
            )}

            {/* Moderation Queue */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-1.5">
                  <Clock size={14} />
                  {t("admin.pending")}
                  {stats && stats.pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                      {stats.pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-1.5">
                  <CheckCircle2 size={14} />
                  {t("admin.approved")}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1.5">
                  <XCircle size={14} />
                  {t("admin.rejected")}
                </TabsTrigger>
                <TabsTrigger value="all">{t("admin.all")}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {submissionsQuery.isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-card rounded-xl border p-4 animate-pulse">
                        <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No submissions in this category</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((uc) => (
                      <div key={uc.id} className="bg-card rounded-xl border p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-serif font-bold text-base truncate">{uc.title}</h3>
                              {uc.isHighlight && (
                                <Badge className="bg-manus-highlight text-white border-0 gap-1 text-[10px] shrink-0">
                                  <Sparkles size={10} />
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={`text-[10px] shrink-0 ${
                                  uc.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : uc.status === "approved"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {uc.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{uc.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>By: {uc.submitterName || "Anonymous"}</span>
                              <span>{uc.submitterEmail}</span>
                              <span>{new Date(uc.createdAt).toLocaleDateString()}</span>
                              <span className="flex items-center gap-0.5"><Eye size={11} /> {uc.viewCount}</span>
                              <span className="flex items-center gap-0.5"><ArrowUp size={11} /> {uc.upvoteCount}</span>
                            </div>
                            {/* Categories */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {uc.categories.map((cat) => (
                                <Badge key={cat.id} variant="secondary" className="text-[10px]">{cat.name}</Badge>
                              ))}
                            </div>
                            {/* Screenshots */}
                            {uc.screenshots.length > 0 && (
                              <div className="flex gap-2 mt-3">
                                {uc.screenshots.slice(0, 4).map((ss) => (
                                  <a key={ss.id} href={ss.url} target="_blank" rel="noopener noreferrer">
                                    <div className="w-16 h-10 rounded-md overflow-hidden border bg-muted">
                                      <img src={ss.url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            )}
                            {/* AI Score */}
                            {uc.aiScore && (
                              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain size={14} className="text-primary" />
                                  <span className="text-xs font-semibold">AI Pre-Scan Score</span>
                                </div>
                                <div className="grid grid-cols-6 gap-2 text-center">
                                  <div>
                                    <div className="text-lg font-bold text-primary">{uc.aiScore.overall}</div>
                                    <div className="text-[10px] text-muted-foreground">Overall</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{uc.aiScore.completeness}</div>
                                    <div className="text-[10px] text-muted-foreground">Complete</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{uc.aiScore.innovativeness}</div>
                                    <div className="text-[10px] text-muted-foreground">Innovative</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{uc.aiScore.impact}</div>
                                    <div className="text-[10px] text-muted-foreground">Impact</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{uc.aiScore.complexity}</div>
                                    <div className="text-[10px] text-muted-foreground">Complex</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{uc.aiScore.presentation}</div>
                                    <div className="text-[10px] text-muted-foreground">Present.</div>
                                  </div>
                                </div>
                                {uc.aiScore.reasoning && (
                                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{uc.aiScore.reasoning}</p>
                                )}
                              </div>
                            )}
                            {/* Rejection reason */}
                            {uc.status === "rejected" && uc.rejectionReason && (
                              <div className="mt-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                                Reason: {uc.rejectionReason}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            {/* AI Scan button */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs"
                              onClick={() => handleAiScan(uc.id)}
                              disabled={scanningIds.has(uc.id)}
                            >
                              {scanningIds.has(uc.id) ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Brain size={13} />
                              )}
                              AI Scan
                            </Button>
                            {uc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() =>
                                    handleApproveClick(uc.id, uc.categories.map((c) => c.id), uc.isHighlight)
                                  }
                                >
                                  <CheckCircle2 size={14} />
                                  {t("admin.approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => handleRejectClick(uc.id)}
                                >
                                  <XCircle size={14} />
                                  {t("admin.reject")}
                                </Button>
                              </>
                            )}
                            {uc.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() =>
                                  handleApproveClick(uc.id, uc.categories.map((c) => c.id), uc.isHighlight)
                                }
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ANALYTICS TAB
            ═══════════════════════════════════════════════════════════════ */}
        {adminTab === "analytics" && (
          <div className="space-y-8">
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Submissions</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalSubmissions}</div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Approval Rate</div>
                  <div className="text-2xl font-bold font-serif text-green-600">
                    {stats.totalSubmissions > 0 ? `${Math.round((stats.approvedCount / stats.totalSubmissions) * 100)}%` : "—"}
                  </div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Upvotes</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalUpvotes ?? 0}</div>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Views</div>
                  <div className="text-2xl font-bold font-serif">{stats.totalViews ?? 0}</div>
                </div>
              </div>
            )}

            {/* Submission Trends Chart */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-serif font-bold text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={16} />
                Submission Trends (Last 30 Days)
              </h3>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.1)"
                      strokeWidth={2}
                      name="Submissions"
                    />
                    <Area
                      type="monotone"
                      dataKey="approvals"
                      stroke="#22c55e"
                      fill="rgba(34, 197, 94, 0.1)"
                      strokeWidth={2}
                      name="Approvals"
                    />
                    <Area
                      type="monotone"
                      dataKey="rejections"
                      stroke="#ef4444"
                      fill="rgba(239, 68, 68, 0.1)"
                      strokeWidth={2}
                      name="Rejections"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available yet
                </div>
              )}
            </div>

            {/* Top Categories */}
            {stats?.topCategories && stats.topCategories.length > 0 && (
              <div className="bg-card rounded-xl border p-5">
                <h3 className="font-serif font-bold text-sm mb-4 flex items-center gap-2">
                  <BarChart3 size={16} />
                  Top Categories
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(200, stats.topCategories.length * 36)}>
                  <BarChart data={stats.topCategories} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                      width={100}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary) / 0.6)" radius={[0, 4, 4, 0]} name="Use Cases" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            USERS TAB
            ═══════════════════════════════════════════════════════════════ */}
        {adminTab === "users" && (
          <div className="space-y-6">
            {/* Admin Users */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-serif font-bold text-sm mb-4 flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                Admins ({adminUsers.length})
              </h3>
              {adminUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admin users found.</p>
              ) : (
                <div className="space-y-2">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {(u.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{u.name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground">{u.email || "No email"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Admin</Badge>
                        {u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => demoteMutation.mutate({ userId: u.id })}
                            disabled={demoteMutation.isPending}
                          >
                            <UserMinus size={12} />
                            Demote
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Regular Users */}
            <div className="bg-card rounded-xl border p-5">
              <h3 className="font-serif font-bold text-sm mb-4 flex items-center gap-2">
                <Users size={16} />
                Users ({regularUsers.length})
              </h3>
              {regularUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No regular users found.</p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {regularUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
                            {(u.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{u.name || "Unnamed"}</div>
                            <div className="text-xs text-muted-foreground">{u.email || "No email"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => promoteMutation.mutate({ userId: u.id })}
                            disabled={promoteMutation.isPending}
                          >
                            <UserPlus size={12} />
                            Make Admin
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ACTIVITY LOG TAB
            ═══════════════════════════════════════════════════════════════ */}
        {adminTab === "activity" && (
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-sm flex items-center gap-2">
                <Activity size={16} />
                Admin Activity Log
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: undefined, label: "All" },
                  { value: "approve", label: "Approved" },
                  { value: "reject", label: "Rejected" },
                  { value: "edit", label: "Edited" },
                  { value: "promote_admin", label: "Promoted" },
                  { value: "demote_admin", label: "Demoted" },
                  { value: "ai_scan", label: "AI Scans" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setActivityFilter(f.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                      activityFilter === f.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent border-border"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity size={48} className="mx-auto mb-4 opacity-30" />
                <p>No admin activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">
                      {act.action === "approve" && <CheckCircle2 size={14} className="text-green-500" />}
                      {act.action === "reject" && <XCircle size={14} className="text-red-500" />}
                      {act.action === "edit" && <FileText size={14} className="text-blue-500" />}
                      {act.action === "promote_admin" && <UserPlus size={14} className="text-purple-500" />}
                      {act.action === "demote_admin" && <UserMinus size={14} className="text-orange-500" />}
                      {act.action === "ai_scan" && <Brain size={14} className="text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <strong>{act.adminName || "Unknown"}</strong>
                        {" "}
                        <span className="text-muted-foreground">
                          {actionLabels[act.action] || act.action}
                        </span>
                        {" "}
                        <span className="text-muted-foreground">
                          {act.targetType === "use_case" ? "use case" : "user"} #{act.targetId}
                        </span>
                      </div>
                      {act.details && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {(() => {
                            try {
                              const d = JSON.parse(act.details);
                              if (d.reason) return `Reason: ${d.reason}`;
                              if (d.overallScore) return `AI Score: ${d.overallScore}/5.0`;
                              return act.details;
                            } catch { return act.details; }
                          })()}
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.approve")} / Edit Use Case</DialogTitle>
            <DialogDescription>Edit categories and highlight status before approving.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="highlight"
                checked={highlightToggle}
                onCheckedChange={(checked) => setHighlightToggle(checked === true)}
              />
              <Label htmlFor="highlight" className="flex items-center gap-1.5 text-sm">
                <Sparkles size={14} className="text-manus-highlight" />
                {t("admin.highlight")}
              </Label>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider">{t("admin.categories")}</Label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {(categoriesQuery.data ?? []).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setEditCategoryIds((prev) =>
                        prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                      editCategoryIds.includes(cat.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent border-border"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.reject")} Use Case</DialogTitle>
            <DialogDescription>
              Please provide a reason for the rejection. This will be visible to the submitter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rejectReason">{t("admin.rejectReason")}</Label>
            <textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full mt-2 rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder="Explain why this submission is being rejected..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              variant="destructive"
              className="gap-1.5"
            >
              {rejectMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("admin.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
