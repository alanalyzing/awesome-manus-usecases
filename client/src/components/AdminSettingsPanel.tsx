import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, CheckCircle2, XCircle, Loader2, Send, ExternalLink, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AdminSettingsPanel() {
  const slackStatus = trpc.admin.getSlackStatus.useQuery();
  const testWebhook = trpc.admin.testSlackWebhook.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Test notification sent to Slack successfully!");
      } else {
        toast.error("Failed to send test notification. Check the webhook URL.");
      }
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });
  const [testSent, setTestSent] = useState(false);

  const handleTestWebhook = () => {
    setTestSent(true);
    testWebhook.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-primary" />
        <h2 className="font-serif font-bold text-lg">Admin Settings</h2>
      </div>

      {/* Slack Integration */}
      <div className="bg-card rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Slack Notifications</h3>
            <p className="text-xs text-muted-foreground">
              Get notified in Slack when use cases are approved or rejected
            </p>
          </div>
          <div className="flex-1" />
          {slackStatus.isLoading ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : slackStatus.data?.configured ? (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 size={12} />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
              <XCircle size={12} />
              Not Configured
            </Badge>
          )}
        </div>

        <Separator />

        {slackStatus.data?.configured ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Webhook URL</p>
                <p className="text-xs font-mono">{slackStatus.data.maskedUrl}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Status</p>
                <p className="text-xs text-green-600 font-medium">Active — notifications enabled</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Bell size={13} />
                Notification Events
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span>Use case approved (single &amp; bulk)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span>Use case rejected</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-green-500" />
                  <span>New use case submission</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleTestWebhook}
                disabled={testWebhook.isPending}
              >
                {testWebhook.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Send Test Notification
              </Button>
              {testSent && testWebhook.isSuccess && testWebhook.data?.success && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Test sent successfully
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              No Slack webhook URL is configured. To enable Slack notifications, add the{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-[11px]">SLACK_WEBHOOK_URL</code>{" "}
              environment variable in the project Secrets settings.
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-semibold mb-1.5">How to set up:</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Go to your Slack workspace &rarr; Apps &rarr; Incoming Webhooks</li>
                <li>Create a new webhook and select the target channel</li>
                <li>Copy the webhook URL</li>
                <li>Add it as <code className="bg-muted px-1 py-0.5 rounded text-[11px]">SLACK_WEBHOOK_URL</code> in project Secrets</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* General Info */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ExternalLink size={14} />
          Quick Links
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://awesome.manus.space"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
          >
            <p className="text-xs font-medium">Live Site</p>
            <p className="text-[11px] text-muted-foreground">awesome.manus.space</p>
          </a>
          <a
            href="https://awesome.manus.space/api/rss"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
          >
            <p className="text-xs font-medium">RSS Feed</p>
            <p className="text-[11px] text-muted-foreground">awesome.manus.space/api/rss</p>
          </a>
          <a
            href="https://awesome.manus.space/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
          >
            <p className="text-xs font-medium">Sitemap</p>
            <p className="text-[11px] text-muted-foreground">awesome.manus.space/sitemap.xml</p>
          </a>
          <a
            href="https://awesome.manus.space/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
          >
            <p className="text-xs font-medium">API Documentation</p>
            <p className="text-[11px] text-muted-foreground">Admin-only access</p>
          </a>
        </div>
      </div>
    </div>
  );
}
