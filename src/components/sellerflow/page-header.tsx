import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[25px] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}

export function DefaultActions({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex gap-2.5">
      <Button
        variant="outline"
        className="hidden md:inline-flex"
        onClick={() => toast.success("Your report is ready to export")}
      >
        Export
      </Button>
      <Button className="shadow-primary" onClick={onCreate}>
        <Plus className="size-4" /> Create order
      </Button>
    </div>
  );
}
