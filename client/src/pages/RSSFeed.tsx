import { useEffect } from "react";

export default function RSSFeedPage() {
  useEffect(() => {
    // Redirect to the actual RSS XML endpoint
    window.location.href = "/api/rss";
  }, []);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to RSS feed...</p>
    </div>
  );
}
