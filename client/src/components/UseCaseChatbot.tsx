import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/lib/i18n";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const SYSTEM_MESSAGE: Message = {
  role: "system",
  content: "You are a helpful assistant for the Manus Use Case Library.",
};

export function UseCaseChatbot() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([SYSTEM_MESSAGE]);

  const askMutation = trpc.aiChat.ask.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    },
    onError: (error) => {
      const isRateLimit = error.message?.includes("limit") || error.data?.code === "TOO_MANY_REQUESTS";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isRateLimit
            ? "You've reached the AI chat limit (20 messages per 10 minutes). Please try again shortly."
            : "Sorry, something went wrong. Please try again.",
        },
      ]);
    },
  });

  const handleSend = useCallback(
    (content: string) => {
      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);

      // Build conversation history (exclude system messages)
      const history = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      askMutation.mutate({
        question: content,
        origin: window.location.origin,
        conversationHistory: history,
      });
    },
    [messages, askMutation]
  );

  const suggestedPrompts = [
    t("chatbot.suggest1"),
    t("chatbot.suggest2"),
    t("chatbot.suggest3"),
    t("chatbot.suggest4"),
    t("chatbot.suggest5"),
    t("chatbot.suggest6"),
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-11 px-3 shrink-0"
        onClick={() => setOpen(true)}
      >
        <Sparkles size={14} />
        <span>{t("chatbot.askAi")}</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles size={18} />
              {t("chatbot.title")}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {t("chatbot.desc")}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSend}
              isLoading={askMutation.isPending}
              placeholder={t("chatbot.placeholder")}
              emptyStateMessage={t("chatbot.empty")}
              suggestedPrompts={suggestedPrompts}
              height="100%"
              className="border-0 shadow-none rounded-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
