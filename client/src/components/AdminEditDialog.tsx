import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Save, Loader2, ImagePlus, X, Sparkles, RotateCcw, Star } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface AdminEditDialogProps {
  slug: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function AdminEditDialog({ slug, onClose, onSaved }: AdminEditDialogProps) {
  const utils = trpc.useUtils();

  // Fetch use case data
  const useCaseQuery = trpc.useCases.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Fetch categories for the multi-select
  const categoriesQuery = trpc.categories.list.useQuery();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionReplayUrl, setSessionReplayUrl] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [isHighlight, setIsHighlight] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Score editing state
  const [scores, setScores] = useState({
    completeness: 3.0,
    innovativeness: 3.0,
    impact: 3.0,
    complexity: 3.0,
    presentation: 3.0,
  });
  const [scoresModified, setScoresModified] = useState(false);

  // AI rewrite state - store previous values for undo
  const [prevTitle, setPrevTitle] = useState<string | null>(null);
  const [prevDescription, setPrevDescription] = useState<string | null>(null);

  const uc = useCaseQuery.data;
  const screenshots = uc?.screenshots ?? [];
  const allCategories = categoriesQuery.data ?? [];

  // Populate form when data loads
  useEffect(() => {
    if (uc) {
      setTitle(uc.title);
      setDescription(uc.description ?? "");
      setSessionReplayUrl(uc.sessionReplayUrl ?? "");
      setDeliverableUrl(uc.deliverableUrl ?? "");
      setSelectedCategoryIds(uc.categories.map((c: any) => c.id));
      setIsHighlight(uc.isHighlight ?? false);
      // Populate scores
      if (uc.aiScore) {
        setScores({
          completeness: parseFloat(uc.aiScore.completeness) || 3.0,
          innovativeness: parseFloat(uc.aiScore.innovativeness) || 3.0,
          impact: parseFloat(uc.aiScore.impact) || 3.0,
          complexity: parseFloat(uc.aiScore.complexity) || 3.0,
          presentation: parseFloat(uc.aiScore.presentation) || 3.0,
        });
      }
      setScoresModified(false);
      // Reset undo state when loading new use case
      setPrevTitle(null);
      setPrevDescription(null);
    }
  }, [uc]);

  // Mutations
  const updateMutation = trpc.admin.update.useMutation({
    onSuccess: () => {
      toast.success("Use case updated successfully");
      utils.useCases.getBySlug.invalidate();
      utils.useCases.list.invalidate();
      utils.useCases.trending.invalidate();
      utils.admin.stats.invalidate();
      utils.admin.submissions.invalidate();
      onSaved?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const aiRewriteMutation = trpc.admin.aiRewrite.useMutation({
    onSuccess: (data, variables) => {
      const field = variables.field;
      if (field === "title" || field === "both") {
        setPrevTitle(title);
        setTitle(data.title);
      }
      if (field === "description" || field === "both") {
        setPrevDescription(description);
        setDescription(data.description);
      }
      toast.success(
        field === "both"
          ? "Title and description rewritten by AI"
          : `${field.charAt(0).toUpperCase() + field.slice(1)} rewritten by AI`
      );
    },
    onError: (err) => toast.error(`AI rewrite failed: ${err.message}`),
  });

  const addScreenshotMutation = trpc.admin.addScreenshot.useMutation({
    onSuccess: () => {
      toast.success("Screenshot added");
      useCaseQuery.refetch();
      setScreenshotUrl("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteScreenshotMutation = trpc.admin.deleteScreenshot.useMutation({
    onSuccess: () => {
      toast.success("Screenshot removed");
      useCaseQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAiRewrite = useCallback((field: "title" | "description" | "both") => {
    if (!uc?.id) return;
    aiRewriteMutation.mutate({
      useCaseId: uc.id,
      field,
      currentTitle: title,
      currentDescription: description,
    });
  }, [uc?.id, title, description, aiRewriteMutation]);

  const handleUndoTitle = useCallback(() => {
    if (prevTitle !== null) {
      setTitle(prevTitle);
      setPrevTitle(null);
      toast.info("Title reverted");
    }
  }, [prevTitle]);

  const handleUndoDescription = useCallback(() => {
    if (prevDescription !== null) {
      setDescription(prevDescription);
      setPrevDescription(null);
      toast.info("Description reverted");
    }
  }, [prevDescription]);

  const updateScoreMutation = trpc.admin.updateScore.useMutation({
    onSuccess: () => {
      toast.success("Score updated");
      useCaseQuery.refetch();
      utils.useCases.getBySlug.invalidate();
      utils.useCases.list.invalidate();
      utils.useCases.trending.invalidate();
      utils.admin.stats.invalidate();
      utils.admin.submissions.invalidate();
      setScoresModified(false);
      onSaved?.();
    },
    onError: (err: any) => toast.error(`Score update failed: ${err.message}`),
  });

  const handleSave = useCallback(async () => {
    if (!uc?.id) return;
    // Save use case fields
    updateMutation.mutate({
      id: uc.id,
      title,
      description,
      sessionReplayUrl: sessionReplayUrl || undefined,
      deliverableUrl: deliverableUrl || undefined,
      categoryIds: selectedCategoryIds,
      isHighlight,
    });
    // Also save scores if they were modified
    if (scoresModified) {
      updateScoreMutation.mutate({
        useCaseId: uc.id,
        ...scores,
      });
    }
  }, [uc?.id, title, description, sessionReplayUrl, deliverableUrl, selectedCategoryIds, isHighlight, updateMutation, scoresModified, scores, updateScoreMutation]);

  const handleAddScreenshotUrl = useCallback(async () => {
    if (!uc?.id || !screenshotUrl.trim()) return;
    try {
      setUploadingScreenshot(true);
      const resp = await fetch(screenshotUrl.trim());
      const blob = await resp.blob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const contentType = blob.type || "image/png";
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1] || "png";
      addScreenshotMutation.mutate({
        useCaseId: uc!.id,
        fileName: `screenshot.${ext}`,
        fileBase64: base64,
        contentType: contentType as any,
      });
    } catch {
      toast.error("Failed to fetch image from URL");
    } finally {
      setUploadingScreenshot(false);
    }
  }, [uc?.id, screenshotUrl, addScreenshotMutation]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!uc?.id) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Only PNG, JPG, WebP, and GIF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    setUploadingScreenshot(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      addScreenshotMutation.mutate({
        useCaseId: uc!.id,
        fileName: file.name,
        fileBase64: base64,
        contentType: file.type as any,
      });
    } catch {
      toast.error("Failed to process file");
    } finally {
      setUploadingScreenshot(false);
    }
  }, [uc?.id, addScreenshotMutation]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleFileUpload(file);
        return;
      }
    }
  }, [handleFileUpload]);

  const handleDeleteScreenshot = useCallback((screenshotId: number) => {
    if (!uc?.id) return;
    deleteScreenshotMutation.mutate({ screenshotId, useCaseId: uc.id });
  }, [uc?.id, deleteScreenshotMutation]);

  const toggleCategory = useCallback((catId: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  }, []);

  const handleScoreChange = useCallback((key: keyof typeof scores, value: number[]) => {
    setScores(prev => ({ ...prev, [key]: value[0] }));
    setScoresModified(true);
  }, []);

  const computedOverall = (
    scores.completeness * 0.20 +
    scores.innovativeness * 0.25 +
    scores.impact * 0.25 +
    scores.complexity * 0.15 +
    scores.presentation * 0.15
  );

  const deleteMutation = trpc.admin.deleteUseCase.useMutation({
    onSuccess: () => {
      toast.success("Use case deleted permanently");
      utils.useCases.list.invalidate();
      utils.useCases.trending.invalidate();
      utils.admin.stats.invalidate();
      onSaved?.();
      onClose();
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message}`),
  });

  const handleDelete = useCallback(() => {
    if (!uc?.id) return;
    deleteMutation.mutate({ id: uc.id });
  }, [uc?.id, deleteMutation]);

  const isSaving = updateMutation.isPending;
  const isRewriting = aiRewriteMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isSavingScores = updateScoreMutation.isPending;

  return (
    <Dialog open={!!slug} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden" onPaste={handlePaste}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="font-serif text-lg">Edit Use Case</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="px-6 py-5 space-y-5">
            {useCaseQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : uc ? (
              <>
                {/* AI Rewrite All button */}
                <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles size={14} className="text-primary" />
                    <span>AI can rewrite the title and description for you</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-primary/30 hover:bg-primary/10"
                    onClick={() => handleAiRewrite("both")}
                    disabled={isRewriting}
                  >
                    {isRewriting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Rewrite Both
                  </Button>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-title" className="text-sm font-medium">Title</Label>
                    <div className="flex items-center gap-1">
                      {prevTitle !== null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={handleUndoTitle}
                              >
                                <RotateCcw size={12} />
                                Undo
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revert to previous title</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-primary"
                              onClick={() => handleAiRewrite("title")}
                              disabled={isRewriting}
                            >
                              {isRewriting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              AI Rewrite
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rewrite title using AI</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Use case title"
                    className={prevTitle !== null ? "border-primary/40 bg-primary/5" : ""}
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-desc" className="text-sm font-medium">Description</Label>
                    <div className="flex items-center gap-1">
                      {prevDescription !== null && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={handleUndoDescription}
                              >
                                <RotateCcw size={12} />
                                Undo
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Revert to previous description</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs gap-1 text-muted-foreground hover:text-primary"
                              onClick={() => handleAiRewrite("description")}
                              disabled={isRewriting}
                            >
                              {isRewriting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              AI Rewrite
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rewrite description using AI</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <Textarea
                    id="edit-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Use case description (Markdown supported)"
                    className={`min-h-[120px] ${prevDescription !== null ? "border-primary/40 bg-primary/5" : ""}`}
                  />
                </div>

                {/* Session Replay URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-session" className="text-sm font-medium">Session Replay URL</Label>
                  <Input
                    id="edit-session"
                    value={sessionReplayUrl}
                    onChange={(e) => setSessionReplayUrl(e.target.value)}
                    placeholder="https://manus.im/share/..."
                  />
                </div>

                {/* Deliverable URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-deliverable" className="text-sm font-medium">Deliverable URL</Label>
                  <Input
                    id="edit-deliverable"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                {/* Categories — Feature */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Features</Label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.filter((c: any) => c.type === "feature").map((cat: any) => (
                      <Badge
                        key={cat.id}
                        variant={selectedCategoryIds.includes(cat.id) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:opacity-80"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Categories — Job Function */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Functions</Label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.filter((c: any) => c.type === "job_function").map((cat: any) => (
                      <Badge
                        key={cat.id}
                        variant={selectedCategoryIds.includes(cat.id) ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:opacity-80"
                        onClick={() => toggleCategory(cat.id)}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Score Editing */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Star size={14} className="text-amber-500" />
                      Scores
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-amber-600">
                        Overall: {computedOverall.toFixed(1)}
                      </span>
                      {scoresModified && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          Modified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 rounded-lg border p-3 bg-muted/30">
                    {([
                      { key: "completeness" as const, label: "Completeness", weight: "20%" },
                      { key: "innovativeness" as const, label: "Innovativeness", weight: "25%" },
                      { key: "impact" as const, label: "Impact", weight: "25%" },
                      { key: "complexity" as const, label: "Complexity", weight: "15%" },
                      { key: "presentation" as const, label: "Presentation", weight: "15%" },
                    ]).map(({ key, label, weight }) => (
                      <div key={key} className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {label} <span className="opacity-60">({weight})</span>
                        </span>
                        <Slider
                          value={[scores[key]]}
                          onValueChange={(v) => handleScoreChange(key, v)}
                          min={0}
                          max={5}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-xs font-mono text-right">{scores[key].toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Highlight */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edit-highlight"
                    checked={isHighlight}
                    onCheckedChange={(checked) => setIsHighlight(!!checked)}
                  />
                  <Label htmlFor="edit-highlight" className="text-sm cursor-pointer">
                    Mark as highlighted (Only on Manus)
                  </Label>
                </div>

                {/* Screenshots */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Screenshots ({screenshots.length})</Label>

                  {/* Existing screenshots */}
                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {screenshots.map((ss: any) => (
                        <div key={ss.id} className="relative group rounded-lg overflow-hidden border bg-muted">
                          <img src={ss.url} alt="Screenshot" className="w-full aspect-video object-cover" />
                          <button
                            onClick={() => handleDeleteScreenshot(ss.id)}
                            className="absolute top-1.5 right-1.5 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove screenshot"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add screenshot by URL */}
                  <div className="flex gap-2">
                    <Input
                      value={screenshotUrl}
                      onChange={(e) => setScreenshotUrl(e.target.value)}
                      placeholder="Paste screenshot URL or paste image (Ctrl+V)"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddScreenshotUrl}
                      disabled={!screenshotUrl.trim() || uploadingScreenshot}
                    >
                      {uploadingScreenshot ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add
                    </Button>
                  </div>

                  {/* Upload file */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScreenshot}
                  >
                    <ImagePlus size={14} />
                    Upload File
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    You can also paste images directly into this dialog (Ctrl/Cmd+V)
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Use case not found
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-3 border-t shrink-0 flex !justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting}>
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this use case?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong className="text-foreground">{uc?.title}</strong> and all associated data (screenshots, scores, upvotes, collection memberships). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || isSavingScores || !title.trim()} className="gap-1.5">
              {(isSaving || isSavingScores) ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
