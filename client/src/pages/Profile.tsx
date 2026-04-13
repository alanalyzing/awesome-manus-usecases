import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { stripMarkdown } from "@/components/MarkdownContent";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ManusLogo } from "@/components/ManusLogo";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Eye,
  ArrowUp,
  Award,
  Loader2,
  Twitter,
  Instagram,
  Linkedin,
  Globe,
  Edit,
  Heart,
  Users,
  UserPlus,
  UserCheck,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const PROFICIENCY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  beginner: { label: "Beginner", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  intermediate: { label: "Intermediate", color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  advanced: { label: "Advanced", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  expert: { label: "Expert", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: <Twitter size={16} />,
  instagram: <Instagram size={16} />,
  linkedin: <Linkedin size={16} />,
  other: <Globe size={16} />,
};

function ProfileRadarChart({ userId }: { userId: number }) {
  const avgQuery = trpc.profile.averageScores.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const avg = avgQuery.data;
  if (!avg || avg.count === 0) return null;

  const data = [
    { dimension: "Completeness", score: avg.completeness, fullMark: 5 },
    { dimension: "Innovation", score: avg.innovativeness, fullMark: 5 },
    { dimension: "Impact", score: avg.impact, fullMark: 5 },
    { dimension: "Complexity", score: avg.complexity, fullMark: 5 },
    { dimension: "Presentation", score: avg.presentation, fullMark: 5 },
  ];

  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Score</h3>
          <span className="text-lg font-bold text-primary">{avg.overall.toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/5</span></span>
        </div>
        <div className="w-full" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickCount={6}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Based on {avg.count} scored use case{avg.count !== 1 ? "s" : ""}</p>
      </CardContent>
    </Card>
  );
}

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  x: (h) => h.startsWith("http") ? h : `https://x.com/${h.replace(/^@/, "")}`,
  instagram: (h) => h.startsWith("http") ? h : `https://instagram.com/${h.replace(/^@/, "")}`,
  linkedin: (h) => h.startsWith("http") ? h : `https://linkedin.com/in/${h.replace(/^@/, "")}`,
  other: (h) => h.startsWith("http") ? h : `https://${h}`,
};

type Tab = "use-cases" | "liked" | "followers" | "following";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username ?? "";
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("use-cases");
  const trpcUtils = trpc.useUtils();

  const profileQuery = trpc.profile.getByUsername.useQuery(
    { username },
    { enabled: !!username }
  );

  const profile = profileQuery.data;
  const isOwnProfile = user && profile && user.id === profile.userId;

  // Stats query
  const statsQuery = trpc.profile.stats.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile }
  );

  // Follow state
  const isFollowingQuery = trpc.profile.isFollowing.useQuery(
    { targetUserId: profile?.userId ?? 0 },
    { enabled: !!user && !!profile && !isOwnProfile }
  );

  const toggleFollowMutation = trpc.profile.toggleFollow.useMutation({
    onSuccess: () => {
      trpcUtils.profile.isFollowing.invalidate({ targetUserId: profile?.userId ?? 0 });
      trpcUtils.profile.stats.invalidate({ userId: profile?.userId ?? 0 });
      trpcUtils.profile.followers.invalidate({ userId: profile?.userId ?? 0 });
      trpcUtils.profile.following.invalidate({ userId: profile?.userId ?? 0 });
    },
  });

  // Tab data queries
  const likedQuery = trpc.profile.likedUseCases.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile && activeTab === "liked" }
  );

  const followersQuery = trpc.profile.followers.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile && activeTab === "followers" }
  );

  const followingQuery = trpc.profile.following.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile && activeTab === "following" }
  );

  const stats = statsQuery.data;

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-serif font-bold text-foreground">Profile Not Found</h1>
        <p className="text-muted-foreground">The user @{username} doesn't have a profile yet.</p>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft size={16} /> Back to Gallery
          </Button>
        </Link>
      </div>
    );
  }

  const proficiency = PROFICIENCY_CONFIG[profile.proficiency] ?? PROFICIENCY_CONFIG.beginner;
  const memberSince = new Date(profile.user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "use-cases", label: "Use Cases", icon: <FileText size={14} />, count: stats?.useCaseCount },
    { key: "liked", label: "Liked", icon: <Heart size={14} />, count: undefined },
    { key: "followers", label: "Followers", icon: <Users size={14} />, count: stats?.followerCount },
    { key: "following", label: "Following", icon: <UserPlus size={14} />, count: stats?.followingCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <ArrowLeft size={14} /> Gallery
            </Button>
          </Link>
          <div className="flex-1" />
          <Link href="/">
            <ManusLogo size="sm" />
          </Link>
        </div>
      </header>

      <div className="container max-w-4xl py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Profile Card */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Avatar / Identity */}
            <div className="flex flex-col items-center md:items-start gap-4 md:w-64 shrink-0">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-serif font-bold text-primary overflow-hidden">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.user.name || username).charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-serif font-bold text-foreground">
                  {profile.user.name || username}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>

              {/* Follow Button */}
              {!isOwnProfile && (
                <div>
                  {user ? (
                    <Button
                      variant={isFollowingQuery.data ? "outline" : "default"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => toggleFollowMutation.mutate({ targetUserId: profile.userId })}
                      disabled={toggleFollowMutation.isPending}
                    >
                      {isFollowingQuery.data ? (
                        <>
                          <UserCheck size={14} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Follow
                        </>
                      )}
                    </Button>
                  ) : (
                    <a href={getLoginUrl()}>
                      <Button variant="default" size="sm" className="gap-1.5">
                        <UserPlus size={14} /> Follow
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {/* Proficiency Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${proficiency.bgColor} ${proficiency.color}`}>
                <Award size={12} />
                {proficiency.label}
              </div>

              {/* Job Title & Company */}
              {(profile.jobTitle || profile.company) && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase size={14} />
                  {[profile.jobTitle, profile.company].filter(Boolean).join(" at ")}
                </div>
              )}

              {/* Member since */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar size={12} />
                Member since {memberSince}
              </div>

              {/* Social Handles */}
              {profile.socialHandles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {profile.socialHandles.map((sh) => (
                    <a
                      key={sh.id}
                      href={PLATFORM_URLS[sh.platform]?.(sh.handle) ?? sh.handle}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-card hover:bg-accent text-xs transition-colors"
                    >
                      {PLATFORM_ICONS[sh.platform]}
                      <span className="text-foreground">{sh.handle}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Edit Profile */}
              {isOwnProfile && (
                <Link href="/profile/setup?edit=1">
                  <Button variant="outline" size="sm" className="gap-1.5 mt-2">
                    <Edit size={12} /> Edit Profile
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats + Bio */}
            <div className="flex-1 space-y-6">
              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
              )}

              {/* Radar Chart - Average Scores */}
              <ProfileRadarChart userId={profile.userId} />

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3 px-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{stats?.useCaseCount ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Use Cases</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{stats?.upvotesReceived ?? 0}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Upvotes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4 text-center">
                    <button
                      onClick={() => setActiveTab("followers")}
                      className="w-full hover:opacity-80 transition-opacity"
                    >
                      <div className="text-2xl font-bold text-foreground">{stats?.followerCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Followers</div>
                    </button>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4 text-center">
                    <button
                      onClick={() => setActiveTab("following")}
                      className="w-full hover:opacity-80 transition-opacity"
                    >
                      <div className="text-2xl font-bold text-foreground">{stats?.followingCount ?? 0}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Following</div>
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 text-xs ${activeTab === tab.key ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "use-cases" && (
            <UseCasesTab useCases={profile.useCases} isOwnProfile={!!isOwnProfile} />
          )}
          {activeTab === "liked" && (
            <LikedTab items={likedQuery.data ?? []} isLoading={likedQuery.isLoading} />
          )}
          {activeTab === "followers" && (
            <UserListTab items={followersQuery.data ?? []} isLoading={followersQuery.isLoading} emptyMessage="No followers yet." />
          )}
          {activeTab === "following" && (
            <UserListTab items={followingQuery.data ?? []} isLoading={followingQuery.isLoading} emptyMessage="Not following anyone yet." />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Tab Components ─────────────────────────────────────────────────

function UseCasesTab({ useCases, isOwnProfile }: { useCases: any[]; isOwnProfile: boolean }) {
  if (useCases.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No published use cases yet.</p>
        {isOwnProfile && (
          <Link href="/submit">
            <Button variant="outline" size="sm" className="mt-4">Submit your first use case</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {useCases.map((uc, i) => (
        <motion.div
          key={uc.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link href={`/use-case/${uc.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              {uc.screenshots.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={uc.screenshots[0].url}
                    alt={uc.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground line-clamp-2 mb-1.5">{uc.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {stripMarkdown(uc.description).substring(0, 120)}
                </p>
                {uc.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {uc.categories.slice(0, 3).map((cat: any) => (
                      <Badge key={cat.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowUp size={12} /> {uc.upvoteCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} /> {uc.viewCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function LikedTab({ items, isLoading }: { items: any[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>No liked use cases yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((uc, i) => (
        <motion.div
          key={uc.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link href={`/use-case/${uc.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              {uc.screenshots?.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={uc.screenshots[0].url}
                    alt={uc.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground line-clamp-2 mb-1.5">{uc.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {stripMarkdown(uc.description).substring(0, 120)}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <ArrowUp size={12} /> {uc.upvoteCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {uc.viewCount}
                    </span>
                  </div>
                  {uc.submitterName && (
                    <span className="text-muted-foreground">by {uc.submitterName}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function UserListTab({
  items,
  isLoading,
  emptyMessage,
}: {
  items: { id: number; name: string | null; username: string | null; avatarUrl: string | null }[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((person, i) => (
        <motion.div
          key={person.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
        >
          {person.username ? (
            <Link href={`/profile/${person.username}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-serif font-bold text-primary shrink-0 overflow-hidden">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name || person.username || ""} className="h-full w-full object-cover" />
                    ) : (
                      (person.name || person.username || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {person.name || person.username}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{person.username}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-serif font-bold text-muted-foreground shrink-0 overflow-hidden">
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt={person.name || ""} className="h-full w-full object-cover" />
                  ) : (
                    (person.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">
                    {person.name || "Anonymous"}
                  </div>
                  <div className="text-xs text-muted-foreground">No profile</div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      ))}
    </div>
  );
}
