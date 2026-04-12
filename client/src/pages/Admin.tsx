import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useState, useCallback } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("pending");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [highlightToggle, setHighlightToggle] = useState(false);
  const [editCategoryIds, setEditCategoryIds] = useState<number[]>([]);

  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const submissionsQuery = trpc.admin.submissions.useQuery(
    { status: activeTab === "all" ? undefined : (activeTab as any) },
    { enabled: user?.role === "admin" }
  );
  const categoriesQuery = trpc.categories.list.useQuery();

  const approveMutation = trpc.admin.approve.useMutation({
    onSuccess: () => {
      toast.success("Use case approved");
      submissionsQuery.refetch();
      statsQuery.refetch();
      setApproveDialogOpen(false);
    },
  });

  const rejectMutation = trpc.admin.reject.useMutation({
    onSuccess: () => {
      toast.success("Use case rejected");
      submissionsQuery.refetch();
      statsQuery.refetch();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">
            You need admin privileges to access this page.
          </p>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <>
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

          {/* Top Categories */}
          {stats.topCategories && stats.topCategories.length > 0 && (
            <div className="bg-card rounded-xl border p-5 mb-8">
              <h3 className="font-serif font-bold text-sm mb-3 flex items-center gap-2">
                <BarChart3 size={16} />
                Top Categories
              </h3>
              <div className="space-y-2">
                {stats.topCategories.map((cat, i) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.count} use cases</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (cat.count / (stats.topCategories[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        )}

        {/* Tabs */}
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
                        <div className="flex items-center gap-2 mb-1">
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
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {uc.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>By: {uc.submitterName || "Anonymous"}</span>
                          <span>{uc.submitterEmail}</span>
                          <span>{new Date(uc.createdAt).toLocaleDateString()}</span>
                          <span className="flex items-center gap-0.5">
                            <Eye size={11} /> {uc.viewCount}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <ArrowUp size={11} /> {uc.upvoteCount}
                          </span>
                        </div>
                        {/* Categories */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {uc.categories.map((cat) => (
                            <Badge key={cat.id} variant="secondary" className="text-[10px]">
                              {cat.name}
                            </Badge>
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
                        {/* Rejection reason */}
                        {uc.status === "rejected" && uc.rejectionReason && (
                          <div className="mt-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                            Reason: {uc.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {uc.status === "pending" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() =>
                              handleApproveClick(
                                uc.id,
                                uc.categories.map((c) => c.id),
                                uc.isHighlight
                              )
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
                        </div>
                      )}
                      {uc.status === "approved" && (
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() =>
                              handleApproveClick(
                                uc.id,
                                uc.categories.map((c) => c.id),
                                uc.isHighlight
                              )
                            }
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.approve")} / Edit Use Case</DialogTitle>
            <DialogDescription>
              Edit categories and highlight status before approving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Highlight toggle */}
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
            {/* Categories */}
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
