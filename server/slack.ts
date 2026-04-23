/**
 * Slack Incoming Webhook integration.
 *
 * Sends rich Block Kit messages to a configured Slack channel
 * when use cases are approved or rejected.
 */

import { ENV } from "./_core/env";

interface SlackStatusChangePayload {
  title: string;
  status: "approved" | "rejected";
  adminName: string;
  reason?: string;
  /** Rich details included for approved use cases */
  details?: {
    description: string;
    submitterName: string;
    submitterEmail: string;
    language: string;
    categoryNames: string[];
    screenshotCount: number;
    sessionReplayUrl?: string;
    deliverableUrl?: string;
  };
}

/**
 * Send a status-change notification to Slack (approved/rejected).
 * For approvals, includes full use case details in the rich Block Kit format.
 * Returns true if delivered, false if skipped or failed.
 * This function is intentionally non-throwing to avoid blocking the approval flow.
 */
export async function notifySlackStatusChange(
  payload: SlackStatusChangePayload
): Promise<boolean> {
  const webhookUrl = ENV.slackWebhookUrl;
  if (!webhookUrl) {
    return false; // No webhook configured — silently skip
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
        text: `*${escapeSlackMarkdown(payload.title)}*`,
      },
    },
  ];

  // For approvals with full details, render the rich format
  if (payload.status === "approved" && payload.details) {
    const d = payload.details;
    const truncatedDesc =
      d.description.length > 300
        ? d.description.slice(0, 297) + "..."
        : d.description;

    const categoryText =
      d.categoryNames.length > 0
        ? d.categoryNames.join(", ")
        : "Uncategorized";

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: escapeSlackMarkdown(truncatedDesc),
      },
    });

    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Submitted by:*\n${escapeSlackMarkdown(d.submitterName)} (${escapeSlackMarkdown(d.submitterEmail)})`,
        },
        {
          type: "mrkdwn",
          text: `*Language:*\n${d.language}`,
        },
        {
          type: "mrkdwn",
          text: `*Categories:*\n${escapeSlackMarkdown(categoryText)}`,
        },
        {
          type: "mrkdwn",
          text: `*Screenshots:*\n${d.screenshotCount}`,
        },
      ],
    });

    // Approved by line
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Approved by:* ${escapeSlackMarkdown(payload.adminName)}`,
      },
    });

    // Action buttons for session replay and deliverable
    const actionElements: Record<string, unknown>[] = [];
    if (d.sessionReplayUrl) {
      actionElements.push({
        type: "button",
        text: { type: "plain_text", text: "View Session Replay", emoji: true },
        url: d.sessionReplayUrl,
        style: "primary",
      });
    }
    if (d.deliverableUrl) {
      actionElements.push({
        type: "button",
        text: { type: "plain_text", text: "View Deliverable", emoji: true },
        url: d.deliverableUrl,
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
          text: "This use case is now live in the *<https://awesome.manus.space|Awesome Use Case Library>*",
        },
      ],
    });
  } else {
    // Simple format for rejections or approvals without details
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${statusText} by ${escapeSlackMarkdown(payload.adminName)}`,
      },
    });

    if (payload.status === "rejected" && payload.reason) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reason:* ${escapeSlackMarkdown(payload.reason)}`,
        },
      });
    }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Use case ${statusText}: ${payload.title}`, // Fallback for notifications
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

/** Escape special Slack mrkdwn characters to prevent formatting issues */
function escapeSlackMarkdown(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
