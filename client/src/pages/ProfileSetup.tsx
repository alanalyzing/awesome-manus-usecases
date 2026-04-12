import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ManusLogo } from "@/components/ManusLogo";
import { Check, X, Loader2, Plus, Trash2, User, Briefcase, Award, Share2 } from "lucide-react";

type SocialHandle = {
  platform: "x" | "instagram" | "linkedin" | "other";
  handle: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  other: "Other",
};

const PROFICIENCY_LABELS: Record<string, { label: string; description: string }> = {
  beginner: { label: "Beginner", description: "Just getting started with Manus" },
  intermediate: { label: "Intermediate", description: "Comfortable with common workflows" },
  advanced: { label: "Advanced", description: "Power user with complex automations" },
  expert: { label: "Expert", description: "Deep expertise, pushing boundaries" },
};

export default function ProfileSetup() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // If user already has a profile, redirect to home
  useEffect(() => {
    if (profileQuery.data) {
      navigate("/", { replace: true });
    }
  }, [profileQuery.data, navigate]);

  const [username, setUsername] = useState("");
  const [proficiency, setProficiency] = useState<string>("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [socialHandles, setSocialHandles] = useState<SocialHandle[]>([
    { platform: "x", handle: "" },
  ]);

  // Debounced username check
  const [debouncedUsername, setDebouncedUsername] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUsername(username), 400);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameCheck = trpc.profile.checkUsername.useQuery(
    { username: debouncedUsername },
    { enabled: debouncedUsername.length >= 3 }
  );

  const createProfile = trpc.profile.create.useMutation({
    onSuccess: () => {
      toast.success("Profile created successfully!");
      navigate("/", { replace: true });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

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
    return (
      username.length >= 3 &&
      usernameCheck.data?.available === true &&
      proficiency !== "" &&
      socialHandles.length >= 1 &&
      socialHandles.every(h => h.handle.trim().length > 0)
    );
  }, [username, usernameCheck.data, proficiency, socialHandles]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    createProfile.mutate({
      username,
      proficiency: proficiency as "beginner" | "intermediate" | "advanced" | "expert",
      company: company || undefined,
      bio: bio || undefined,
      socialHandles: socialHandles.filter(h => h.handle.trim().length > 0),
    });
  }, [isFormValid, username, proficiency, company, bio, socialHandles, createProfile]);

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
            <CardTitle>Sign in to create your profile</CardTitle>
            <CardDescription>You need to be logged in to set up your contributor profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => { window.location.href = getLoginUrl(); }}>
              Sign In with Manus
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
            Set Up Your Profile
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your contributor profile to showcase your Manus use cases and connect with the community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Username */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Choose a Username</CardTitle>
                  <CardDescription>This will be your unique profile URL</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                  placeholder="your-username"
                  maxLength={32}
                  className="pr-10"
                />
                {debouncedUsername.length >= 3 && (
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
              </div>
              {debouncedUsername.length >= 3 && usernameCheck.data && (
                <p className={`text-xs ${usernameCheck.data.available ? "text-green-600" : "text-red-600"}`}>
                  {usernameCheck.data.available
                    ? `✓ /profile/${debouncedUsername} is available`
                    : usernameCheck.data.reason}
                </p>
              )}
              {username.length > 0 && username.length < 3 && (
                <p className="text-xs text-muted-foreground">Username must be at least 3 characters</p>
              )}
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
                  <CardTitle className="text-lg">Social Handles</CardTitle>
                  <CardDescription>Add at least one social profile so others can connect with you</CardDescription>
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
                  <Input
                    value={handle.handle}
                    onChange={(e) => updateSocialHandle(index, "handle", e.target.value)}
                    placeholder={handle.platform === "other" ? "https://..." : `@username`}
                    className="flex-1"
                  />
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
                  <Plus className="h-3 w-3 mr-1" /> Add another
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
                  <CardTitle className="text-lg">Manus Proficiency</CardTitle>
                  <CardDescription>How would you rate your experience with Manus?</CardDescription>
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
                        : "border-border hover:border-muted-foreground/30"
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
                  <CardTitle className="text-lg">Additional Info</CardTitle>
                  <CardDescription>Optional — helps others learn more about you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Company / Organization</label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  maxLength={128}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community a bit about yourself and how you use Manus..."
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
              onClick={() => navigate("/")}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || createProfile.isPending}
              className="min-w-[160px]"
            >
              {createProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
