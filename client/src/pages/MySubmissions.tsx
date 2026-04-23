import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Bell,
  BellOff,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Heart,
} from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

export default function MySubmissions() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useI18n();

  const notificationsQuery = trpc.user.notifications.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const submissionsQuery = trpc.user.mySubmissions.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const markRead = trpc.user.markNotificationsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  // Mark all notifications as read when page loads
  useEffect(() => {
    if (isAuthenticated && notificationsQuery.data && notificationsQuery.data.some(n => !n.isRead)) {
      markRead.mutate();
    }
  }, [isAuthenticated, notificationsQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Bell size={48} className="text-muted-foreground/30" />
        <h2 className="font-serif text-xl font-bold">Sign in to view your submissions</h2>
        <p className="text-muted-foreground text-sm">You need to be logged in to see your submissions and notifications.</p>
        <a href={getLoginUrl()}>
          <Button>Sign In with Manus</Button>
        </a>
      </div>
    );
  }

  const notifications = notificationsQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 size={14} className="text-primary" />;
      case "rejected": return <XCircle size={14} className="text-muted-foreground" />;
      default: return <Clock size={14} className="text-muted-foreground/60" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case "rejected": return <Badge className="bg-muted text-muted-foreground border-border">Rejected</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground/80 border-border">Pending Review</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <h1 className="font-serif font-bold text-lg">My Submissions</h1>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <Tabs defaultValue="submissions">
          <TabsList className="mb-6">
            <TabsTrigger value="submissions" className="gap-1.5">
              <FileText size={14} />
              Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell size={14} />
              Notifications ({notifications.length})
            </TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-serif text-lg font-bold mb-2">No submissions yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Share your first Manus use case with the community!</p>
                <Link href="/submit">
                  <Button>Submit a Use Case</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((uc) => (
                  <div
                    key={uc.id}
                    className="bg-card border rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="mt-0.5">{statusIcon(uc.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-serif font-bold text-sm truncate">{uc.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{uc.description}</p>
                        </div>
                        {statusBadge(uc.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye size={11} />
                          {uc.viewCount} views
                        </span>
                        <span className="flex items-center gap-1">
<Heart size={11} />
                           {uc.upvoteCount} upvotes
                        </span>
                        <span>
                          Submitted {new Date(uc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Categories */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {uc.categories.slice(0, 4).map((cat) => (
                          <Badge key={cat.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t(`cat.${cat.slug}` as any) || cat.name}
                          </Badge>
                        ))}
                      </div>
                      {/* Rejection reason */}
                      {uc.status === "rejected" && uc.rejectionReason && (
                        <div className="mt-2 p-2 bg-muted border border-border rounded text-xs text-muted-foreground">
                          <strong>Reason:</strong> {uc.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            {notifications.length === 0 ? (
              <div className="text-center py-16">
                <BellOff size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-serif text-lg font-bold mb-2">No notifications</h3>
                <p className="text-muted-foreground text-sm">You'll receive notifications when your submissions are reviewed.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-card border rounded-lg p-4 transition-colors ${
                      !notif.isRead ? "border-primary/30 bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {notif.type === "approved" ? (
                          <CheckCircle2 size={16} className="text-primary" />
                        ) : (
                          <XCircle size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{notif.useCaseTitle}</span>
                          <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
