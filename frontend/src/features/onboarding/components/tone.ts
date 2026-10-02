import { tone } from "../labels";

export const TONE_BADGE: Record<ReturnType<typeof tone>, string> = {
  ok: "border-transparent bg-success-soft text-success",
  bad: "border-transparent bg-destructive-soft text-destructive",
  warn: "border-transparent bg-warning-soft text-warning",
  muted: "border-transparent bg-muted text-muted-foreground",
};

export const toneBadge = (v: string | null | undefined) => TONE_BADGE[tone(v)];
