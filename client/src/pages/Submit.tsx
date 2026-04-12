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
import { ArrowLeft, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { LOCALES } from "@/lib/i18n";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

type UploadedFile = {
  url: string;
  fileKey: string;
  name: string;
  preview: string;
};

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
  const [selectedJobFunctions, setSelectedJobFunctions] = useState<number[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = trpc.categories.list.useQuery();
  const uploadMutation = trpc.useCases.uploadScreenshot.useMutation();
  const submitMutation = trpc.useCases.submit.useMutation();

  const jobFunctionCats = (categoriesQuery.data ?? []).filter((c) => c.type === "job_function");
  const featureCats = (categoriesQuery.data ?? []).filter((c) => c.type === "feature");

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (uploadedFiles.length + files.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: Only PNG, JPG, WebP, and GIF allowed`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: File exceeds 5MB limit`);
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
        toast.error("Title and description are required");
        return;
      }
      if (selectedJobFunctions.length === 0 && selectedFeatures.length === 0) {
        toast.error("Please select at least one category");
        return;
      }
      if (uploadedFiles.length === 0) {
        toast.error("Please upload at least one screenshot");
        return;
      }
      if (!consent) {
        toast.error("Please accept the consent checkbox to continue");
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
        toast.error(err.message || "Submission failed");
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
              Back
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("submit.useCaseTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="bg-card"
            />
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
              rows={6}
              className="w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground">{description.length}/5000</p>
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
                  {cat.name}
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
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <Label>{t("submit.screenshots")} *</Label>
            <p className="text-xs text-muted-foreground">{t("submit.screenshotHelp")}</p>
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
                </div>
              ))}
              {uploadedFiles.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-[16/10] rounded-lg border-2 border-dashed hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {uploading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Upload size={20} />
                      <span className="text-xs">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Session Replay URL */}
          <div className="space-y-2">
            <Label htmlFor="sessionReplay">{t("submit.sessionReplayUrl")}</Label>
            <Input
              id="sessionReplay"
              type="url"
              value={sessionReplayUrl}
              onChange={(e) => setSessionReplayUrl(e.target.value)}
              placeholder="https://..."
              className="bg-card"
            />
          </div>

          {/* Deliverable URL */}
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

          {/* Consent */}
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
          <Button type="submit" disabled={submitting} className="w-full gap-2">
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
