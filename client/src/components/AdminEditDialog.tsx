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
import { Trash2, Plus, Save, Loader2, ImagePlus, X } from "lucide-react";
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
    }
  }, [uc]);

  // Mutations
  const updateMutation = trpc.admin.update.useMutation({
    onSuccess: () => {
      toast.success("Use case updated successfully");
      utils.useCases.getBySlug.invalidate();
      utils.useCases.list.invalidate();
      utils.useCases.trending.invalidate();
      onSaved?.();
    },
    onError: (err) => toast.error(err.message),
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

  const handleSave = useCallback(() => {
    if (!uc?.id) return;
    updateMutation.mutate({
      id: uc.id,
      title,
      description,
      sessionReplayUrl: sessionReplayUrl || undefined,
      deliverableUrl: deliverableUrl || undefined,
      categoryIds: selectedCategoryIds,
      isHighlight,
    });
  }, [uc?.id, title, description, sessionReplayUrl, deliverableUrl, selectedCategoryIds, isHighlight, updateMutation]);

  const handleAddScreenshotUrl = useCallback(async () => {
    if (!uc?.id || !screenshotUrl.trim()) return;
    try {
      setUploadingScreenshot(true);
      // Fetch the image and convert to base64
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

  const isSaving = updateMutation.isPending;

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
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title" className="text-sm font-medium">Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Use case title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-desc" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="edit-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Use case description (Markdown supported)"
                    className="min-h-[120px]"
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

                {/* Categories */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map((cat: any) => (
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

        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()} className="gap-1.5">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
