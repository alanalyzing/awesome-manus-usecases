import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ManusLogo } from "@/components/ManusLogo";
import { Trophy, ArrowLeft, FileText, Heart, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

type SortMode = "usecases" | "likes";

const MEDAL_COLORS = [
  "from-yellow-400 to-amber-500", // Gold
  "from-gray-300 to-gray-400",    // Silver
  "from-amber-600 to-amber-700",  // Bronze
];

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<SortMode>("usecases");

  const leaderboardQuery = trpc.admin.contributorLeaderboard.useQuery({
    limit: 50,
    sortBy,
  });

  const entries = leaderboardQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <button className="p-2 hover:bg-accent rounded-md transition-colors">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div className="flex-1" />
          <Link href="/">
            <ManusLogo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-8 sm:py-12">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Trophy size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">
            Contributor Leaderboard
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Recognizing the top contributors who share their Manus use cases with the community.
          </p>
        </div>

        {/* Sort Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
            <button
              onClick={() => setSortBy("usecases")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                sortBy === "usecases"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <FileText size={14} />
              By Use Cases
            </button>
            <button
              onClick={() => setSortBy("likes")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                sortBy === "likes"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Heart size={14} />
              By Likes
            </button>
          </div>
        </div>

        {/* Loading State */}
        {leaderboardQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!leaderboardQuery.isLoading && entries.length === 0 && (
          <div className="text-center py-16">
            <Trophy size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">No contributors yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Be the first to submit a use case and appear on the leaderboard!
            </p>
            <Link href="/submit">
              <Button>Submit a Use Case</Button>
            </Link>
          </div>
        )}

        {/* Leaderboard List */}
        {!leaderboardQuery.isLoading && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry: any, index: number) => {
              const isTopThree = index < 3;
              const primaryStat = sortBy === "usecases" ? entry.approvedCount : entry.totalUpvotes;
              const secondaryStat = sortBy === "usecases" ? entry.totalUpvotes : entry.approvedCount;
              const primaryLabel = sortBy === "usecases"
                ? `use case${entry.approvedCount !== 1 ? "s" : ""}`
                : `like${entry.totalUpvotes !== 1 ? "s" : ""}`;
              const secondaryLabel = sortBy === "usecases"
                ? `like${entry.totalUpvotes !== 1 ? "s" : ""}`
                : `use case${entry.approvedCount !== 1 ? "s" : ""}`;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                >
                  <Link
                    href={entry.username ? `/profile/${entry.username}` : "#"}
                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm ${
                      isTopThree
                        ? "bg-card border-primary/20 hover:border-primary/40"
                        : "bg-card hover:bg-accent/30"
                    }`}
                  >
                    {/* Rank */}
                    <div className="shrink-0 w-8 text-center">
                      {isTopThree ? (
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${MEDAL_COLORS[index]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                          {index + 1}
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center ${
                      isTopThree ? "ring-2 ring-primary/20" : "border"
                    } bg-muted`}>
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={24} className="text-muted-foreground" />
                      )}
                    </div>

                    {/* Name & Username */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isTopThree ? "text-base" : "text-sm"}`}>
                        {entry.name || "Anonymous"}
                      </div>
                      {entry.username && (
                        <div className="text-xs text-muted-foreground truncate">
                          @{entry.username}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="shrink-0 text-right">
                      <div className={`font-bold tabular-nums ${isTopThree ? "text-lg" : "text-base"} ${
                        sortBy === "likes" ? "text-rose-500" : "text-primary"
                      }`}>
                        {primaryStat}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {primaryLabel}
                      </div>
                    </div>

                    {/* Secondary Stat */}
                    <div className="shrink-0 text-right hidden sm:block w-16">
                      <div className="text-sm font-medium tabular-nums text-muted-foreground flex items-center justify-end gap-0.5">
                        {sortBy === "usecases" ? <Heart size={12} /> : <FileText size={12} />}
                        {secondaryStat}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {secondaryLabel}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
