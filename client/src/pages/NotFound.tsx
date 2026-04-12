import { Button } from "@/components/ui/button";
import { ManusGlyph } from "@/components/ManusLogo";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
          <ManusGlyph size={32} className="opacity-40" />
        </div>
        <div>
          <h1 className="font-serif text-6xl font-bold text-muted-foreground/30 mb-2">404</h1>
          <h2 className="font-serif text-xl font-bold mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button onClick={() => setLocation("/")} className="gap-2">
          <Home size={15} />
          Back to Gallery
        </Button>
      </div>
    </div>
  );
}
