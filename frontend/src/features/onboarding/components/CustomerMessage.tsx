import { MessageSquareText } from "lucide-react";

export function CustomerMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <section aria-labelledby="msg-title" className="space-y-2">
      <h3 id="msg-title" className="text-sm font-medium">
        Lo que verá el cliente
      </h3>
      <div className="flex items-end gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <MessageSquareText className="size-3.5" />
        </span>
        <blockquote className="max-w-prose rounded-2xl rounded-bl-sm bg-secondary px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-secondary-foreground">
          {message.replace(/\s+•\s+/g, "\n• ")}
        </blockquote>
      </div>
    </section>
  );
}
