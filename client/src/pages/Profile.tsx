import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { stripMarkdown } from "@/components/MarkdownContent";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Star,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";

const PROFICIENCY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  beginner: { label: "Beginner", color: "text-foreground/70", bgColor: "bg-muted/60 border-border" },
  intermediate: { label: "Intermediate", color: "text-foreground/70", bgColor: "bg-muted/60 border-border" },
  advanced: { label: "Advanced", color: "text-foreground/70", bgColor: "bg-muted/60 border-border" },
  expert: { label: "Expert", color: "text-foreground", bgColor: "bg-primary/10 border-primary/20" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  x: <Twitter size={15} />,
  instagram: <Instagram size={15} />,
  linkedin: <Linkedin size={15} />,
  other: <Globe size={15} />,
};

const PLATFORM_URLS: Record<string, (handle: string) => string> = {
  x: (h) => h.startsWith("http") ? h : `https://x.com/${h.replace(/^@/, "")}`,
  instagram: (h) => h.startsWith("http") ? h : `https://instagram.com/${h.replace(/^@/, "")}`,
  linkedin: (h) => h.startsWith("http") ? h : `https://linkedin.com/in/${h.replace(/^@/, "")}`,
  other: (h) => h.startsWith("http") ? h : `https://${h}`,
};

/** Compact average score display replacing the radar chart */
function AverageScoreBadge({ userId }: { userId: number }) {
  const avgQuery = trpc.profile.averageScores.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const avg = avgQuery.data;
  if (!avg || avg.count === 0) return null;

  const overall = Number(avg.overall) || 0;
  const dimensions = [
    { label: "Completeness", value: Number(avg.completeness) || 0 },
    { label: "Innovation", value: Number(avg.innovativeness) || 0 },
    { label: "Impact", value: Number(avg.impact) || 0 },
    { label: "Complexity", value: Number(avg.complexity) || 0 },
    { label: "Presentation", value: Number(avg.presentation) || 0 },
  ];

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
          <Star size={20} className="text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground tracking-tight">
            {overall.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-0.5">/5</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Avg. across {avg.count} use case{avg.count !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        {dimensions.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${(d.value / 5) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium text-foreground w-7 text-right">{d.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const statsQuery = trpc.profile.stats.useQuery(
    { userId: profile?.userId ?? 0 },
    { enabled: !!profile }
  );

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
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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

      <div className="container max-w-3xl py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* ─── Profile Hero ─────────────────────────────────── */}
          <div className="flex flex-col items-center text-center mb-10">
            {/* Avatar */}
            <div className="h-28 w-28 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-serif font-bold text-primary overflow-hidden ring-4 ring-background shadow-lg mb-5">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                (profile.user.name || username).charAt(0).toUpperCase()
              )}
            </div>

            {/* Name & handle */}
            <h1 className="text-2xl font-serif font-bold text-foreground mb-0.5">
              {profile.user.name || username}
            </h1>
            <p className="text-sm text-muted-foreground mb-3">@{profile.username}</p>

            {/* Bio — prominently placed right under the name */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-4">
                {profile.bio}
              </p>
            )}

            {/* Meta line: job title, company, member since */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-4">
              {(profile.jobTitle || profile.company) && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase size={12} />
                  {[profile.jobTitle, profile.company].filter(Boolean).join(" at ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                Joined {memberSince}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${proficiency.bgColor} ${proficiency.color}`}>
                <Award size={11} />
                {proficiency.label}
              </span>
            </div>

            {/* Social handles */}
            {profile.socialHandles.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                {profile.socialHandles.map((sh) => (
                  <a
                    key={sh.id}
                    href={PLATFORM_URLS[sh.platform]?.(sh.handle) ?? sh.handle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:bg-accent text-xs transition-colors"
                  >
                    {PLATFORM_ICONS[sh.platform]}
                    <span className="text-foreground">{sh.handle}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {!isOwnProfile && (
                <>
                  {user ? (
                    <Button
                      variant={isFollowingQuery.data ? "outline" : "default"}
                      size="sm"
                      className="gap-1.5 rounded-full px-5"
                      onClick={() => toggleFollowMutation.mutate({ targetUserId: profile.userId })}
                      disabled={toggleFollowMutation.isPending}
                    >
                      {isFollowingQuery.data ? (
                        <><UserCheck size={14} /> Following</>
                      ) : (
                        <><UserPlus size={14} /> Follow</>
                      )}
                    </Button>
                  ) : (
                    <a href={getLoginUrl()}>
                      <Button variant="default" size="sm" className="gap-1.5 rounded-full px-5">
                        <UserPlus size={14} /> Follow
                      </Button>
                    </a>
                  )}
                </>
              )}
              {isOwnProfile && (
                <Link href="/profile/setup?edit=1">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-full px-5">
                    <Edit size={12} /> Edit Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* ─── Stats Row ────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Use Cases", value: stats?.useCaseCount ?? 0 },
              { label: "Upvotes", value: stats?.upvotesReceived ?? 0 },
              { label: "Followers", value: stats?.followerCount ?? 0, action: () => setActiveTab("followers") },
              { label: "Following", value: stats?.followingCount ?? 0, action: () => setActiveTab("following") },
            ].map((stat) => (
              <button
                key={stat.label}
                onClick={stat.action}
                className={`rounded-xl border bg-card p-4 text-center transition-colors ${stat.action ? "hover:bg-accent cursor-pointer" : "cursor-default"}`}
                disabled={!stat.action}
              >
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</div>
              </button>
            ))}
          </div>

          {/* ─── Average Score ────────────────────────────────── */}
          <div className="mb-8">
            <AverageScoreBadge userId={profile.userId} />
          </div>

          {/* ─── Tabs ─────────────────────────────────────────── */}
          <div className="border-b mb-6">
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-1 text-xs ${activeTab === tab.key ? "text-foreground/60" : "text-muted-foreground/50"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Tab Content ──────────────────────────────────── */}
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
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No published use cases yet.</p>
        {isOwnProfile && (
          <Link href="/submit">
            <Button variant="outline" size="sm" className="mt-4 rounded-full">Submit your first use case</Button>
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
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              {uc.screenshots.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={uc.screenshots[0].url}
                    alt={uc.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
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
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Heart className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No liked use cases yet.</p>
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
            <Card className="hover:shadow-md transition-all cursor-pointer h-full group">
              {uc.screenshots?.length > 0 && (
                <div className="aspect-video overflow-hidden rounded-t-lg">
                  <img
                    src={uc.screenshots[0].url}
                    alt={uc.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
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
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">{emptyMessage}</p>
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
              <Card className="hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-serif font-bold text-primary shrink-0 overflow-hidden">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt={person.name || person.username || ""} className="h-full w-full object-cover" />
                    ) : (
                      (person.name || person.username || "?").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
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
