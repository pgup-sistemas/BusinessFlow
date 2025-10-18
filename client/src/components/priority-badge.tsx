import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
  className?: string;
}

const priorityConfig = {
  URGENT: {
    label: "Urgente",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  HIGH: {
    label: "Alta",
    className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  NORMAL: {
    label: "Normal",
    className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  LOW: {
    label: "Baixa",
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge
      variant="outline"
      className={cn(config.className, "font-semibold uppercase text-xs", className)}
      data-testid={`badge-priority-${priority.toLowerCase()}`}
    >
      {config.label}
    </Badge>
  );
}
