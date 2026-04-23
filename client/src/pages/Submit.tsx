import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useI18n } from "@/lib/i18n";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Lightbulb,
  PenLine,
  BookOpen,
  ImageIcon,
  LinkIcon,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { LOCALES, type Locale } from "@/lib/i18n";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type UploadedFile = {
  url: string;
  fileKey: string;
  name: string;
  preview: string;
};

const GUIDE_ICONS = [LinkIcon, Sparkles, ImageIcon, PenLine];

function SubmissionGuidelines() {
  const { t } = useI18n();
  const steps = [
    { title: t("submit.guideStep1Title"), desc: t("submit.guideStep1Desc") },
    { title: t("submit.guideStep2Title"), desc: t("submit.guideStep2Desc") },
    { title: t("submit.guideStep3Title"), desc: t("submit.guideStep3Desc") },
    { title: t("submit.guideStep4Title"), desc: t("submit.guideStep4Desc") },
  ];

  return (
    <div className="rounded-xl border bg-card p-5 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Lightbulb size={16} className="text-primary" />
        </div>
        <h3 className="font-semibold text-sm">{t("submit.guidelinesTitle")}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t("submit.guidelinesIntro")}</p>

      <Accordion type="single" collapsible className="w-full">
        {steps.map((step, i) => {
          const Icon = GUIDE_ICONS[i];
          return (
            <AccordionItem key={i} value={`step-${i}`} className="border-b-0">
              <AccordionTrigger className="py-2.5 text-sm hover:no-underline gap-2">
                <span className="flex items-center gap-2.5 text-left">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium shrink-0">
                    {i + 1}
                  </span>
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <span>{step.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground pl-[3.25rem] pb-3">
                {step.desc}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export default function SubmitPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useI18n();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionReplayUrl, setSessionReplayUrl] = useState("");
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [language, setLanguage] = useState("en");
  const [consent, setConsent] = useState(false);
  const [rightsAgreed, setRightsAgreed] = useState(false);
  const [selectedJobFunctions, setSelectedJobFunctions] = useState<number[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const categoriesQuery = trpc.categories.list.useQuery();
  const uploadMutation = trpc.useCases.uploadScreenshot.useMutation();
  const submitMutation = trpc.useCases.submit.useMutation();
  const aiSummarizeMutation = trpc.useCases.aiSummarize.useMutation();

  // Duplicate URL detection - debounced via stable input
  const isValidManusUrl = useMemo(() => {
    const url = sessionReplayUrl.trim();
    return url.length > 10 && (url.includes("manus.space") || url.includes("manus.im/share/"));
  }, [sessionReplayUrl]);

  const duplicateCheck = trpc.useCases.checkDuplicateUrl.useQuery(
    { sessionReplayUrl: sessionReplayUrl.trim() },
    { enabled: isValidManusUrl, retry: false, staleTime: 30000 }
  );

  // Duplicate deliverable URL detection
  const isValidDeliverableUrl = useMemo(() => {
    const url = deliverableUrl.trim();
    return url.length > 10 && (url.startsWith("http://") || url.startsWith("https://"));
  }, [deliverableUrl]);

  const deliverableDuplicateCheck = trpc.useCases.checkDuplicateDeliverable.useQuery(
    { deliverableUrl: deliverableUrl.trim() },
    { enabled: isValidDeliverableUrl, retry: false, staleTime: 30000 }
  );

  const jobFunctionCats = (categoriesQuery.data ?? []).filter((c) => c.type === "job_function");
  const featureCats = (categoriesQuery.data ?? []).filter((c) => c.type === "feature");

  const handleAddScreenshotUrl = useCallback(() => {
    const url = screenshotUrl.trim();
    if (!url) return;
    if (uploadedFiles.length >= MAX_FILES) {
      toast.error(t("submit.maxScreenshots"));
      return;
    }
    try { new URL(url); } catch { toast.error(t("submit.invalidUrl")); return; }
    setUploadedFiles((prev) => [
      ...prev,
      { url, fileKey: "", name: url.split("/").pop() || "screenshot", preview: url },
    ]);
    setScreenshotUrl("");
  }, [screenshotUrl, uploadedFiles]);

  const handlePasteImage = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      if (uploadedFiles.length >= MAX_FILES) {
        toast.error(t("submit.maxScreenshots"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t("submit.maxScreenshots"));
        return;
      }
      setUploading(true);
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const result = await uploadMutation.mutateAsync({
          fileName: `pasted-${Date.now()}.png`,
          fileBase64: base64,
          contentType: file.type,
        });
        setUploadedFiles((prev) => [
          ...prev,
          { url: result.url, fileKey: result.fileKey, name: `pasted-image`, preview: result.url },
        ]);
        toast.success(t("submit.imagePasted"));
      } catch (err: any) {
        toast.error(t("submit.pasteError"));
      } finally {
        setUploading(false);
      }
    },
    [uploadedFiles, uploadMutation]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (uploadedFiles.length + files.length > MAX_FILES) {
        toast.error(t("submit.maxScreenshots"));
        return;
      }

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: PNG, JPG, WebP, GIF`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: max 5MB`);
          continue;
        }

        setUploading(true);
        try {
          const base64 = await fileToBase64(file);
          const result = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileBase64: base64,
            contentType: file.type,
          });
          setUploadedFiles((prev) => [
            ...prev,
            {
              url: result.url,
              fileKey: result.fileKey,
              name: file.name,
              preview: URL.createObjectURL(file),
            },
          ]);
        } catch (err: any) {
          toast.error(`Failed to upload ${file.name}: ${err.message}`);
        }
        setUploading(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadedFiles, uploadMutation]
  );

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !description.trim()) {
        toast.error(t("submit.titleRequired"));
        return;
      }
      if (selectedJobFunctions.length === 0 && selectedFeatures.length === 0) {
        toast.error(t("submit.categoryRequired"));
        return;
      }
      if (uploadedFiles.length === 0) {
        toast.error(t("submit.screenshotRequired"));
        return;
      }
      if (!sessionReplayUrl.trim()) {
        toast.error(t("submit.replayRequired"));
        return;
      }
      const trimmedUrl = sessionReplayUrl.trim();
      if (!trimmedUrl.includes("manus.space") && !trimmedUrl.includes("manus.im/share/")) {
        toast.error(
          t("submit.replayUrlHint"),
          { duration: 8000 }
        );
        return;
      }

      setSubmitting(true);
      try {
        await submitMutation.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          sessionReplayUrl: sessionReplayUrl.trim() || undefined,
          deliverableUrl: deliverableUrl.trim() || undefined,
          language,
          consentToContact: consent,
          categoryIds: [...selectedJobFunctions, ...selectedFeatures],
          screenshotUrls: uploadedFiles.map((f) => ({ url: f.url, fileKey: f.fileKey })),
        });
        navigate("/submit/success");
      } catch (err: any) {
        toast.error(err.message || t("submit.submitFailed"));
      }
      setSubmitting(false);
    },
    [title, description, sessionReplayUrl, deliverableUrl, language, consent, selectedJobFunctions, selectedFeatures, uploadedFiles, submitMutation, navigate]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <h2 className="font-serif text-2xl font-bold mb-2">{t("common.loginRequired")}</h2>
          <p className="text-muted-foreground mb-6">{t("common.loginRequiredDesc")}</p>
          <a href={getLoginUrl()}>
            <Button className="gap-2">{t("nav.login")}</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft size={14} />
              {t("submit.back")}
            </Button>
          </Link>
          <h1 className="font-serif font-bold text-sm">{t("submit.title")}</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="font-serif text-2xl font-bold mb-2">{t("submit.heading")}</h2>
          <p className="text-muted-foreground text-sm">{t("submit.desc")}</p>
        </div>

        {/* Submission Guidelines */}
        <SubmissionGuidelines />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Replay URL - FIRST */}
          <div className="space-y-2">
            <Label htmlFor="sessionReplay">
              {t("submit.sessionReplayUrl")}
              <span className="ml-1 text-destructive">*</span>
            </Label>
            <Input
              id="sessionReplay"
              type="url"
              value={sessionReplayUrl}
              onChange={(e) => setSessionReplayUrl(e.target.value)}
              placeholder="https://manus.im/share/... or any manus.space URL"
              className={`bg-card ${sessionReplayUrl.trim() && !sessionReplayUrl.trim().includes("manus.space") && !sessionReplayUrl.trim().includes("manus.im/share/") ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            {sessionReplayUrl.trim() && !sessionReplayUrl.trim().includes("manus.space") && !sessionReplayUrl.trim().includes("manus.im/share/") ? (
              <p className="text-xs text-destructive">{t("submit.replayUrlHint")}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("submit.sessionReplayHint")}</p>
            )}
            {duplicateCheck.data?.isDuplicate && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 mt-2">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-300">{t("submit.duplicateReplay")}</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    {t("submit.existingUseCase")}: <Link href={`/use-case/${duplicateCheck.data.existingSlug}`} className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200">{duplicateCheck.data.existingTitle}</Link>
                    {duplicateCheck.data.existingStatus === "pending" && <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1.5 border-amber-400">{t("submit.pendingReview")}</Badge>}
                    {duplicateCheck.data.existingStatus === "approved" && <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1.5 border-green-400">{t("submit.approvedBadge")}</Badge>}
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 mt-1">{t("submit.canStillSubmit")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Deliverable URL - SECOND */}
          <div className="space-y-2">
            <Label htmlFor="deliverable">{t("submit.deliverableUrl")}</Label>
            <Input
              id="deliverable"
              type="url"
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              placeholder="https://..."
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">{t("submit.deliverableHint")}</p>
            {deliverableDuplicateCheck.data?.isDuplicate && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 mt-2">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-amber-800 dark:text-amber-300">{t("submit.duplicateDeliverable")}</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-1">
                    {t("submit.existingUseCase")}: <Link href={`/use-case/${deliverableDuplicateCheck.data.existingSlug}`} className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200">{deliverableDuplicateCheck.data.existingTitle}</Link>
                    {deliverableDuplicateCheck.data.existingStatus === "pending" && <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1.5 border-amber-400">{t("submit.pendingReview")}</Badge>}
                    {deliverableDuplicateCheck.data.existingStatus === "approved" && <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1.5 border-green-400">{t("submit.approvedBadge")}</Badge>}
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 mt-1">{t("submit.canStillSubmit")}</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Summarize Button */}
          {(sessionReplayUrl.trim().includes("manus.space") || sessionReplayUrl.trim().includes("manus.im/share/")) && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span className="text-sm font-medium">{t("submit.aiCanWrite")}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setAiSummarizing(true);
                    try {
                      const result = await aiSummarizeMutation.mutateAsync({
                        sessionReplayUrl: sessionReplayUrl.trim(),
                        deliverableUrl: deliverableUrl.trim() || undefined,
                      });
                      if (result.title) setTitle(result.title);
                      if (result.description) setDescription(result.description);
                      toast.success(t("submit.aiSuccess"));
                    } catch (err: any) {
                      toast.error(err.message || t("submit.aiError"));
                    } finally {
                      setAiSummarizing(false);
                    }
                  }}
                  disabled={aiSummarizing}
                  className="gap-1.5"
                >
                  {aiSummarizing ? (
                    <><Loader2 size={14} className="animate-spin" /> {t("submit.aiGenerating")}</>
                  ) : (
                    <><Sparkles size={14} /> {t("submit.aiSummarize")}</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("submit.aiGeneratedHint")}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("submit.useCaseTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder={t("submit.titlePlaceholder")}
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">
              {t("submit.titleHint")}
              <span className="float-right">{title.length}/200</span>
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("submit.description")} *</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              required
              rows={8}
              placeholder={t("submit.descPlaceholder")}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {t("submit.descHint")}
              <span className="float-right">{description.length}/5000</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t("submit.markdownHint")}
            </p>
          </div>

          {/* Job Function Categories */}
          <div className="space-y-2">
            <Label>{t("submit.jobFunction")} *</Label>
            <div className="flex flex-wrap gap-2">
              {jobFunctionCats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedJobFunctions((prev) =>
                      prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    selectedJobFunctions.includes(cat.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {t(`cat.${cat.slug}` as any) || cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Feature Categories */}
          <div className="space-y-2">
            <Label>{t("submit.features")} *</Label>
            <div className="flex flex-wrap gap-2">
              {featureCats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setSelectedFeatures((prev) =>
                      prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    selectedFeatures.includes(cat.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-accent border-border"
                  }`}
                >
                  {t(`cat.${cat.slug}` as any) || cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <Label>{t("submit.screenshots")} *</Label>
            <p className="text-xs text-muted-foreground">{t("submit.screenshotHelp")}</p>
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted aspect-[16/10]">
                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    {i === 0 && (
                      <Badge className="absolute bottom-1 left-1 text-[10px] bg-primary/90 text-primary-foreground border-0">
                        {t("submit.coverBadge")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            {uploadedFiles.length < MAX_FILES && (
              <div className="flex items-center gap-2" onPaste={handlePasteImage}>
                <Input
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddScreenshotUrl(); } }}
                  placeholder={t("submit.screenshotUrlPlaceholder")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddScreenshotUrl}
                  disabled={!screenshotUrl.trim()}
                  className="gap-1 shrink-0"
                >
                  {t("submit.addBtn")}
                </Button>
              </div>
            )}
            {uploadedFiles.length < MAX_FILES && (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {t("submit.uploadFile")}
                </Button>
                <span className="text-xs text-muted-foreground">{t("submit.pasteHint")}</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>{t("submit.language")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[200px] bg-card">
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
          </div>

          {/* Rights Agreement */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="rightsAgreement"
              checked={rightsAgreed}
              onCheckedChange={(checked) => setRightsAgreed(checked === true)}
            />
            <Label htmlFor="rightsAgreement" className="text-sm text-muted-foreground leading-relaxed">
              {t("submit.rightsAgreement")}
            </Label>
          </div>

          {/* Interview Consent (optional) */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked === true)}
            />
            <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed">
              {t("submit.consent")}
            </Label>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={submitting || !rightsAgreed} className="w-full gap-2">
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("submit.submitting")}
              </>
            ) : (
              t("submit.submitBtn")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
