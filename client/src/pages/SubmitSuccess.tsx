import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function SubmitSuccessPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-primary" />
          </div>
        </div>
        <h1 className="font-serif text-2xl font-bold mb-3">{t("submit.success")}</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">{t("submit.successDesc")}</p>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft size={16} />
            {t("submit.backToGallery")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
