
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { getLoginUrl } from "@/const";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ManusLogo } from "@/components/ManusLogo";
import { Check, X, Loader2, Plus, Trash2, User, Briefcase, Award, Share2, Camera, ImageIcon } from "lucide-react";

type SocialHandle = {
  platform: "x" | "instagram" | "linkedin" | "other";
  handle: string;
};

const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function ProfileSetup() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const isEditMode = new URLSearchParams(searchString).get("edit") === "1";

  const PROFICIENCY_LABELS: Record<string, { label: string; description: string }> = {
    beginner: { label: t("profileSetup.beginner"), description: t("profileSetup.beginnerDesc") },
    intermediate: { label: t("profileSetup.intermediate"), description: t("profileSetup.intermediateDesc") },
    advanced: { label: t("profileSetup.advanced"), description: t("profileSetup.advancedDesc") },
    expert: { label: t("profileSetup.expert"), description: t("profileSetup.expertDesc") },
  };

  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // If user already has a profile and NOT in edit mode, redirect to home
  useEffect(() => {
    if (profileQuery.data && !isEditMode) {
      navigate("/", { replace: true });
    }
  }, [profileQuery.data, navigate, isEditMode]);

  const [username, setUsername] = useState("");
  const [proficiency, setProficiency] = useState<string>("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([
    { platform: "x", handle: "" },
  ]);
  const [initialized, setInitialized] = useState(false);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && profileQuery.data && !initialized) {
      const p = profileQuery.data;
      setUsername(p.username);
      setProficiency(p.proficiency);
      setCompany(p.company || "");
      setJobTitle(p.jobTitle || "");
      setBio(p.bio || "");
      if (p.avatarUrl) {
        setAvatarPreview(p.avatarUrl);
        setAvatarUrl(p.avatarUrl);
      }
      if (p.socialHandles && p.socialHandles.length > 0) {
        setSocialHandles(p.socialHandles.map((h: any) => ({ platform: h.platform, handle: h.handle })));
      }
      setInitialized(true);
    }
  }, [isEditMode, profileQuery.data, initialized]);

  // Debounced username check
  const [debouncedUsername, setDebouncedUsername] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(username), 400);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameCheck = trpc.profile.checkUsername.useQuery(
    { username: debouncedUsername },
    {
      enabled: debouncedUsername.length >= 3 && !(isEditMode && profileQuery.data?.username === debouncedUsername),
    }
  );

  // In edit mode, if username hasn't changed, it's always "available"
  const isUsernameAvailable = isEditMode && profileQuery.data?.username === debouncedUsername
    ? true
    : usernameCheck.data?.available === true;

  const uploadAvatar = trpc.profile.uploadAvatar.useMutation({
    onSuccess: (data) => {
      setAvatarUrl(data.url);
      setAvatarUploading(false);
      toast.success(t("profileSetup.avatarUploaded"));
    },
    onError: (err) => {
      setAvatarUploading(false);
      setAvatarPreview(null);
      toast.error(err.message);
    },
  });

  const createProfile = trpc.profile.create.useMutation({
    onSuccess: () => {
      toast.success(t("profileSetup.profileCreated"));
      navigate("/", { replace: true });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success(t("profileSetup.profileUpdated"));
      const uname = profileQuery.data?.username || username;
      navigate(`/profile/${uname}`, { replace: true });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error(t("profileSetup.fileTypeError"));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t("profileSetup.fileSizeError"));
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarUploading(true);

    // Convert to base64 and upload
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadAvatar.mutate({
        fileBase64: base64,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [uploadAvatar, t]);

  const removeAvatar = useCallback(() => {
    setAvatarPreview(null);
    setAvatarUrl(null);
  }, []);

  const addSocialHandle = useCallback(() => {
    const usedPlatforms = new Set(socialHandles.map(h => h.platform));
    const nextPlatform = (["x", "instagram", "linkedin", "other"] as const).find(p => !usedPlatforms.has(p)) || "other";
    setSocialHandles(prev => [...prev, { platform: nextPlatform, handle: "" }]);
  }, [socialHandles]);

  const removeSocialHandle = useCallback((index: number) => {
    setSocialHandles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSocialHandle = useCallback((index: number, field: "platform" | "handle", value: string) => {
    setSocialHandles(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  }, []);

  const isFormValid = useMemo(() => {
    // In edit mode, block submission if username changed but limit reached
    const isUsernameChanged = isEditMode && profileQuery.data?.username !== username;
    const isAtUsernameLimit = isEditMode && (profileQuery.data?.usernameChangeCount ?? 0) >= 5;
    if (isUsernameChanged && isAtUsernameLimit) return false;

    return (
      username.length >= 3 &&
      (isUsernameAvailable || (isEditMode && profileQuery.data?.username === username)) &&
      proficiency !== "" &&
      socialHandles.length >= 1 &&
      socialHandles.every(h => h.handle.trim().length > 0) &&
      !avatarUploading
    );
  }, [username, isUsernameAvailable, isEditMode, profileQuery.data, proficiency, socialHandles, avatarUploading]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const filteredHandles = socialHandles.filter(h => h.handle.trim().length > 0);

    if (isEditMode) {
      updateProfile.mutate({
        username,
        proficiency: proficiency as "beginner" | "intermediate" | "advanced" | "expert",
        company: company || null,
        jobTitle: jobTitle || null,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        socialHandles: filteredHandles,
      });
    } else {
      createProfile.mutate({
        username,
        proficiency: proficiency as "beginner" | "intermediate" | "advanced" | "expert",
        company: company || undefined,
        jobTitle: jobTitle || undefined,
        bio: bio || undefined,
        socialHandles: filteredHandles,
      });
    }
  }, [isFormValid, isEditMode, username, proficiency, company, jobTitle, bio, avatarUrl, socialHandles, createProfile, updateProfile]);

  const isPending = createProfile.isPending || updateProfile.isPending;

  if (authLoading || profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ManusLogo className="h-8 mx-auto mb-4" />
            <CardTitle>{t("profileSetup.signInTitle")}</CardTitle>
            <CardDescription>{t("profileSetup.signInDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => { window.location.href = getLoginUrl(); }}>
              {t("profileSetup.signInBtn")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <ManusLogo className="h-8 mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            {isEditMode ? t("profileSetup.editTitle") : t("profileSetup.createTitle")}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isEditMode ? t("profileSetup.editDesc") : t("profileSetup.createDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("profileSetup.photoTitle")}</CardTitle>
                  <CardDescription>{t("profileSetup.photoDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {/* Avatar preview */}
                <div className="relative group">
                  <div
                    className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  {avatarPreview && !avatarUploading && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        {t("profileSetup.uploading")}
                      </>
                    ) : avatarPreview ? (
                      t("profileSetup.changePhoto")
                    ) : (
                      t("profileSetup.uploadPhoto")
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("profileSetup.photoHelp")}
                  </p>
                  {avatarUrl && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {t("profileSetup.uploadSuccess")}
                    </p>
                  )}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </CardContent>
          </Card>

          {/* Step 1: Username */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("profileSetup.usernameTitle")}</CardTitle>
                  <CardDescription>{t("profileSetup.usernameDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder={t("profileSetup.usernamePlaceholder")}
                  maxLength={32}
                  className="pr-10"
                />
                {debouncedUsername.length >= 3 && !(isEditMode && profileQuery.data?.username === debouncedUsername) && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameCheck.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : usernameCheck.data?.available ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
                {isEditMode && profileQuery.data?.username === debouncedUsername && debouncedUsername.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              {debouncedUsername.length >= 3 && !(isEditMode && profileQuery.data?.username === debouncedUsername) && usernameCheck.data && (
                <p className={`text-xs ${usernameCheck.data.available ? "text-green-600" : "text-red-600"}`}>
                  {usernameCheck.data.available
                    ? `\u2713 ${t("profileSetup.usernameAvailable").replace("{0}", debouncedUsername)}`
                    : usernameCheck.data.reason}
                </p>
              )}
              {isEditMode && profileQuery.data?.username === debouncedUsername && debouncedUsername.length >= 3 && (
                <p className="text-xs text-green-600">{"\u2713"} {t("profileSetup.currentUsername")}</p>
              )}
              {username.length > 0 && username.length < 3 && (
                <p className="text-xs text-muted-foreground">{t("profileSetup.usernameMinLength")}</p>
              )}
              {isEditMode && profileQuery.data && (() => {
                const changeCount = profileQuery.data.usernameChangeCount ?? 0;
                const remaining = Math.max(0, 5 - changeCount);
                const isAtLimit = remaining === 0;
                const isCurrentUsername = profileQuery.data.username === username;
                return (
                  <div className={`text-xs mt-1 ${isAtLimit && !isCurrentUsername ? "text-red-600" : "text-muted-foreground"}`}>
                    {isAtLimit
                      ? isCurrentUsername
                        ? t("profileSetup.usernameChangesUsed")
                        : t("profileSetup.usernameChangesMax")
                      : t("profileSetup.usernameChangesRemaining").replace("{0}", String(remaining))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Step 2: Social Handles */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Share2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("profileSetup.socialTitle")}</CardTitle>
                  <CardDescription>{t("profileSetup.socialDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialHandles.map((handle, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Select
                    value={handle.platform}
                    onValueChange={(val) => updateSocialHandle(index, "platform", val)}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 flex items-center">
                    {handle.platform === "linkedin" && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-2 rounded-l-md border border-r-0 whitespace-nowrap">
                        linkedin.com/in/
                      </span>
                    )}
                    {handle.platform === "x" && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-2 rounded-l-md border border-r-0 whitespace-nowrap">
                        x.com/
                      </span>
                    )}
                    {handle.platform === "instagram" && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-2 rounded-l-md border border-r-0 whitespace-nowrap">
                        instagram.com/
                      </span>
                    )}
                    <Input
                      value={handle.handle}
                      onChange={(e) => updateSocialHandle(index, "handle", e.target.value)}
                      placeholder={handle.platform === "other" ? "https://..." : "username"}
                      className={handle.platform !== "other" ? "rounded-l-none border-l-0" : ""}
                    />
                  </div>
                  {socialHandles.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialHandle(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              {socialHandles.length < 4 && (
                <Button type="button" variant="outline" size="sm" onClick={addSocialHandle} className="mt-2">
                  <Plus className="h-3 w-3 mr-1" /> {t("profileSetup.addAnother")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Proficiency */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("profileSetup.proficiencyTitle")}</CardTitle>
                  <CardDescription>{t("profileSetup.proficiencyDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PROFICIENCY_LABELS).map(([key, { label, description }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProficiency(key)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      proficiency === key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Optional Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("profileSetup.additionalTitle")}</CardTitle>
                  <CardDescription>{t("profileSetup.additionalDesc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("profileSetup.jobTitle")}</label>
                  <Input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder={t("profileSetup.jobTitlePlaceholder")}
                    maxLength={128}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("profileSetup.company")}</label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder={t("profileSetup.companyPlaceholder")}
                    maxLength={128}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("profileSetup.bio")}</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("profileSetup.bioPlaceholder")}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (isEditMode && profileQuery.data?.username) {
                  navigate(`/profile/${profileQuery.data.username}`);
                } else {
                  navigate("/");
                }
              }}
            >
              {isEditMode ? t("profileSetup.cancel") : t("profileSetup.skipForNow")}
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isPending}
              className="min-w-[160px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditMode ? t("profileSetup.saving") : t("profileSetup.creating")}
                </>
              ) : (
                isEditMode ? t("profileSetup.saveChanges") : t("profileSetup.createProfile")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
