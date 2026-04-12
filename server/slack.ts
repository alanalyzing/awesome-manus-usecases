/**
 * Slack Incoming Webhook integration.
 *
 * Sends rich Block Kit messages to a configured Slack channel
 * when new use case submissions arrive.
 */

import { ENV } from "./_core/env";

interface SlackSubmissionPayload {
  title: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
  language: string;
  categoryNames: string[];
  sessionReplayUrl?: string;
  deliverableUrl?: string;
  screenshotCount: number;
}

/**
 * Send a new-submission notification to Slack via incoming webhook.
 * Returns true if delivered, false if skipped or failed.
 * This function is intentionally non-throwing to avoid blocking the submission flow.
 */
export async function notifySlackNewSubmission(
  payload: SlackSubmissionPayload
): Promise<boolean> {
  const webhookUrl = ENV.slackWebhookUrl;
  if (!webhookUrl) {
    return false; // No webhook configured — silently skip
  }

  const truncatedDesc =
    payload.description.length > 300
      ? payload.description.slice(0, 297) + "..."
      : payload.description;

  const categoryText =
    payload.categoryNames.length > 0
      ? payload.categoryNames.join(", ")
      : "Uncategorized";

  // Build Slack Block Kit message
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📥 New Use Case Submission",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeSlackMarkdown(payload.title)}*`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: escapeSlackMarkdown(truncatedDesc),
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Submitted by:*\n${escapeSlackMarkdown(payload.submitterName)} (${escapeSlackMarkdown(payload.submitterEmail)})`,
        },
        {
          type: "mrkdwn",
          text: `*Language:*\n${payload.language}`,
        },
        {
          type: "mrkdwn",
          text: `*Categories:*\n${escapeSlackMarkdown(categoryText)}`,
        },
        {
          type: "mrkdwn",
          text: `*Screenshots:*\n${payload.screenshotCount}`,
        },
      ],
    },
  ];

  // Add action links if available
  const actionElements: Record<string, unknown>[] = [];
  if (payload.sessionReplayUrl) {
    actionElements.push({
      type: "button",
      text: { type: "plain_text", text: "View Session Replay", emoji: true },
      url: payload.sessionReplayUrl,
      style: "primary",
    });
  }
  if (payload.deliverableUrl) {
    actionElements.push({
      type: "button",
      text: { type: "plain_text", text: "View Deliverable", emoji: true },
      url: payload.deliverableUrl,
    });
  }

  if (actionElements.length > 0) {
    blocks.push({
      type: "actions",
      elements: actionElements,
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "Review this submission in the *Admin Panel* → Moderation tab",
      },
    ],
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New use case submission: ${payload.title}`, // Fallback for notifications
        blocks,
      }),
    });

    if (!response.ok) {
      console.warn(
        `[Slack] Webhook returned ${response.status}: ${await response.text()}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Slack] Failed to send webhook:", err);
    return false;
  }
}

/**
 * Send a status-change notification to Slack (approved/rejected).
 */
export async function notifySlackStatusChange(payload: {
  title: string;
  status: "approved" | "rejected";
  adminName: string;
  reason?: string;
}): Promise<boolean> {
  const webhookUrl = ENV.slackWebhookUrl;
  if (!webhookUrl) {
    return false;
  }

  const emoji = payload.status === "approved" ? "✅" : "❌";
  const statusText = payload.status === "approved" ? "Approved" : "Rejected";

  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} Use Case ${statusText}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${escapeSlackMarkdown(payload.title)}*\n${statusText} by ${escapeSlackMarkdown(payload.adminName)}`,
      },
    },
  ];

  if (payload.status === "rejected" && payload.reason) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Reason:* ${escapeSlackMarkdown(payload.reason)}`,
      },
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Use case ${statusText}: ${payload.title}`,
        blocks,
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn("[Slack] Failed to send status webhook:", err);
    return false;
  }
}

/** Escape special Slack mrkdwn characters to prevent formatting issues */
function escapeSlackMarkdown(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
