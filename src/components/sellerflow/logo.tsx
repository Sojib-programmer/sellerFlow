import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card",
          box,
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2">
          <path
            d="M4 16.5c2.2 1.4 4.4 2.1 6.6 2.1 3.1 0 5-1.3 5-3.2 0-4.4-11-2.2-11-7.4C4.6 5.6 7 4 10.7 4c2 0 4 .5 5.9 1.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M17 12.5l2.6 2.6L24 10.7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(-2 2)"
          />
        </svg>
      </span>
      {showText ? (
        <span className={cn("min-w-0 truncate font-bold tracking-tight", text)}>
          SellerFlow <span className="text-primary">BD</span>
        </span>
      ) : null}
    </span>
  );
}
