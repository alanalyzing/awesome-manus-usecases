import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check, BookOpen, Key, Send, RefreshCw, List, Rss, Globe } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="absolute top-2 right-2 p-1.5 rounded-md bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative group">
      <pre className="bg-[#1a1a1a] text-[#e0e0e0] rounded-lg p-4 text-xs leading-relaxed overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

function EndpointSection({
  method,
  path,
  description,
  auth,
  body,
  response,
  example,
  notes,
}: {
  method: "GET" | "POST" | "PATCH";
  path: string;
  description: string;
  auth?: string;
  body?: string;
  response: string;
  example: string;
  notes?: string[];
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PATCH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="p-5 border-b">
        <div className="flex items-center gap-3 mb-2">
          <Badge className={`${methodColors[method]} border font-mono text-[10px] font-bold px-2`}>
            {method}
          </Badge>
          <code className="font-mono text-sm font-semibold">{path}</code>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {auth && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Key size={11} />
            <span>{auth}</span>
          </div>
        )}
        {notes && notes.length > 0 && (
          <div className="mt-3 space-y-1">
            {notes.map((note, i) => (
              <p key={i} className="text-[11px] text-muted-foreground/80 leading-relaxed">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
        {body && (
          <div className="p-4">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Request Body</h4>
            <CodeBlock code={body} language="json" />
          </div>
        )}
        <div className={`p-4 ${!body ? "md:col-span-2" : ""}`}>
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Response</h4>
          <CodeBlock code={response} language="json" />
        </div>
      </div>

      <div className="p-4 border-t bg-accent/20">
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Example</h4>
        <CodeBlock code={example} />
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft size={14} />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            <h1 className="font-serif font-bold text-sm">API Documentation</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-3">Manus Use Case Library API</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The Use Case Library provides a REST API for programmatic access. You can submit new use cases,
            update existing ones, browse categories, and consume an RSS feed of newly approved content.
          </p>
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Globe size={12} className="text-primary" />
              <span className="font-semibold">Base URL:</span>
              <code className="font-mono bg-accent px-1.5 py-0.5 rounded text-[11px]">
                https://manuslib-jnjq5dyo.manus.space
              </code>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Key size={12} className="text-primary" />
              <span className="font-semibold">Authentication:</span>
              <span className="text-muted-foreground">Bearer token via <code className="font-mono bg-accent px-1 py-0.5 rounded text-[11px]">Authorization</code> header (for write endpoints)</span>
            </div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="space-y-6">
          <h3 className="font-serif text-lg font-bold flex items-center gap-2">
            <List size={16} className="text-primary" />
            Endpoints
          </h3>

          {/* GET /api/categories */}
          <EndpointSection
            method="GET"
            path="/api/categories"
            description="List all available categories grouped by type (job_function and feature). Use the returned slugs when submitting use cases."
            response={`{
  "categories": [
    {
      "id": 1,
      "name": "Marketing",
      "slug": "marketing",
      "type": "job_function"
    },
    {
      "id": 5,
      "name": "Data Analysis",
      "slug": "data-analysis",
      "type": "feature"
    }
  ]
}`}
            example={`curl https://manuslib-jnjq5dyo.manus.space/api/categories`}
          />

          {/* POST /api/submit */}
          <EndpointSection
            method="POST"
            path="/api/submit"
            description="Submit a new use case to the library. Submissions enter the moderation queue and must be approved by an admin before appearing publicly."
            auth="Bearer token required (API_SUBMIT_KEY)"
            body={`{
  "title": "My Use Case",
  "description": "What it does...",
  "sessionReplayUrl": "https://manus.im/share/...",
  "deliverableUrl": "https://example.com/output",
  "language": "en",
  "categorySlugs": ["marketing", "data-analysis"],
  "screenshotUrls": [
    "https://cdn.example.com/img1.png"
  ],
  "submitterName": "Your Name",
  "submitterEmail": "you@example.com"
}`}
            response={`{
  "success": true,
  "useCase": {
    "id": 42,
    "slug": "my-use-case-abc123",
    "title": "My Use Case",
    "status": "pending"
  }
}`}
            example={`curl -X POST https://manuslib-jnjq5dyo.manus.space/api/submit \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Market Research Report",
    "description": "Comprehensive competitor analysis...",
    "sessionReplayUrl": "https://manus.im/share/abc123",
    "categorySlugs": ["marketing", "research"]
  }'`}
            notes={[
              "Required fields: title, description. All others are optional.",
              "sessionReplayUrl should be a valid manus.im/share link.",
              "screenshotUrls accepts up to 5 publicly accessible image URLs.",
              "categorySlugs must match slugs from GET /api/categories.",
            ]}
          />

          {/* POST /api/submit/bulk */}
          <EndpointSection
            method="POST"
            path="/api/submit/bulk"
            description="Submit multiple use cases in a single request (max 20 items per batch)."
            auth="Bearer token required (API_SUBMIT_KEY)"
            body={`{
  "items": [
    {
      "title": "Use Case 1",
      "description": "Description...",
      "sessionReplayUrl": "https://manus.im/share/...",
      "categorySlugs": ["marketing"]
    },
    {
      "title": "Use Case 2",
      "description": "Description...",
      "sessionReplayUrl": "https://manus.im/share/..."
    }
  ]
}`}
            response={`{
  "success": true,
  "results": [
    { "index": 0, "success": true, "slug": "use-case-1-abc123" },
    { "index": 1, "success": true, "slug": "use-case-2-def456" }
  ],
  "summary": {
    "total": 2,
    "succeeded": 2,
    "failed": 0
  }
}`}
            example={`curl -X POST https://manuslib-jnjq5dyo.manus.space/api/submit/bulk \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"items": [{"title": "Use Case 1", "description": "..."}]}'`}
          />

          {/* PATCH /api/update */}
          <EndpointSection
            method="PATCH"
            path="/api/update"
            description="Update an existing use case by ID, slug, or session replay URL. Useful for backfilling fields like deliverableUrl."
            auth="Bearer token required (API_SUBMIT_KEY)"
            body={`{
  "id": 42,
  "slug": "my-use-case-abc123",
  "sessionReplayUrl": "https://manus.im/share/...",
  "updates": {
    "deliverableUrl": "https://example.com/output",
    "title": "Updated Title",
    "description": "Updated description",
    "categorySlugs": ["marketing", "sales"],
    "screenshotUrls": ["https://cdn.example.com/new.png"]
  }
}`}
            response={`{
  "success": true,
  "useCase": {
    "id": 42,
    "slug": "my-use-case-abc123",
    "title": "Updated Title"
  }
}`}
            example={`curl -X PATCH https://manuslib-jnjq5dyo.manus.space/api/update \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionReplayUrl": "https://manus.im/share/abc123",
    "updates": { "deliverableUrl": "https://example.com/output" }
  }'`}
            notes={[
              "Provide exactly one of: id, slug, or sessionReplayUrl as the lookup key.",
              "Only fields included in updates will be modified.",
              "screenshotUrls are appended to existing screenshots, not replaced.",
            ]}
          />

          {/* PATCH /api/update/bulk */}
          <EndpointSection
            method="PATCH"
            path="/api/update/bulk"
            description="Batch update multiple use cases in a single request (max 50 items)."
            auth="Bearer token required (API_SUBMIT_KEY)"
            body={`{
  "items": [
    {
      "sessionReplayUrl": "https://manus.im/share/abc",
      "updates": { "deliverableUrl": "https://..." }
    },
    {
      "id": 99,
      "updates": { "title": "New Title" }
    }
  ]
}`}
            response={`{
  "success": true,
  "results": [
    { "index": 0, "success": true, "id": 42 },
    { "index": 1, "success": true, "id": 99 }
  ],
  "summary": {
    "total": 2,
    "succeeded": 2,
    "failed": 0
  }
}`}
            example={`curl -X PATCH https://manuslib-jnjq5dyo.manus.space/api/update/bulk \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"items": [{"id": 42, "updates": {"deliverableUrl": "https://..."}}]}'`}
          />

          {/* GET /api/rss */}
          <EndpointSection
            method="GET"
            path="/api/rss"
            description="RSS 2.0 feed of the most recently approved use cases. Subscribe in any RSS reader to get notified of new additions."
            response={`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Awesome Manus Use Cases</title>
    <description>Latest approved use cases</description>
    <item>
      <title>Market Research Report</title>
      <link>https://manuslib-jnjq5dyo.manus.space/use-case/...</link>
      <description>...</description>
      <pubDate>Mon, 14 Apr 2026 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`}
            example={`curl https://manuslib-jnjq5dyo.manus.space/api/rss`}
            notes={["Returns XML with content-type application/rss+xml.", "Feed includes the 50 most recently approved use cases."]}
          />
        </section>

        {/* Rate Limits */}
        <section className="bg-card border rounded-xl p-5">
          <h3 className="font-serif font-bold text-sm mb-2">Rate Limits</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The API is rate-limited at the platform level. For bulk operations, we recommend batching requests
            using the bulk endpoints (max 20 for submit, max 50 for update) and adding a 1-second delay between
            batch requests. If you receive a 429 response, wait 60 seconds before retrying.
          </p>
        </section>

        {/* Error Codes */}
        <section className="bg-card border rounded-xl p-5">
          <h3 className="font-serif font-bold text-sm mb-3">Error Codes</h3>
          <div className="space-y-2 text-xs">
            <div className="flex gap-3">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">400</Badge>
              <span className="text-muted-foreground">Bad Request — missing required fields or invalid input</span>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">401</Badge>
              <span className="text-muted-foreground">Unauthorized — missing or invalid Bearer token</span>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">404</Badge>
              <span className="text-muted-foreground">Not Found — use case not found with the given identifier</span>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">429</Badge>
              <span className="text-muted-foreground">Too Many Requests — rate limit exceeded, retry after 60s</span>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">500</Badge>
              <span className="text-muted-foreground">Internal Server Error — unexpected failure, contact support</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
