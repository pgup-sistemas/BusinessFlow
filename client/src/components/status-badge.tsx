import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  processing: {
    label: "Processando",
    icon: Loader2,
    className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  failed: {
    label: "Falhou",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  draft: {
    label: "Rascunho",
    icon: Clock,
    className: "bg-muted/10 text-muted-foreground border-muted/20",
  },
  sent: {
    label: "Enviado",
    icon: CheckCircle2,
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  approved: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  blocked: {
    label: "Bloqueado",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  rejected: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1.5 font-medium", config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}
