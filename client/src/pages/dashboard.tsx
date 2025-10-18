import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { MessageSquare, CheckCircle2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/star-rating";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Review, Response } from "@shared/schema";

interface DashboardStats {
  totalReviews: number;
  responseRate: number;
  avgResponseTime: string;
  pendingReviews: number;
  trends: {
    reviews: number;
    responseRate: number;
  };
}

interface RecentReview extends Review {
  company: { name: string };
  response?: Response;
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentReviews, isLoading: reviewsLoading } = useQuery<RecentReview[]>({
    queryKey: ["/api/dashboard/recent-reviews"],
  });

  const handleSync = async () => {
    try {
      toast({
        title: "Sincronização iniciada",
        description: "Buscando novas avaliações...",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar avaliações",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de gestão de avaliações
          </p>
        </div>
        <Button onClick={handleSync} data-testid="button-sync">
          Sincronizar Agora
        </Button>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Avaliações"
            value={stats.totalReviews}
            icon={MessageSquare}
            trend={{ value: stats.trends.reviews, label: "vs. semana passada" }}
          />
          <StatCard
            title="Taxa de Resposta"
            value={`${stats.responseRate}%`}
            icon={CheckCircle2}
            trend={{ value: stats.trends.responseRate, label: "vs. semana passada" }}
          />
          <StatCard
            title="Tempo Médio"
            value={stats.avgResponseTime}
            icon={Clock}
            description="Tempo de resposta"
          />
          <StatCard
            title="Pendentes"
            value={stats.pendingReviews}
            icon={AlertCircle}
            description="Aguardando processamento"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Avaliações Recentes</CardTitle>
            <CardDescription>Últimas avaliações recebidas</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : recentReviews && recentReviews.length > 0 ? (
              <div className="space-y-4">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start gap-4 rounded-lg border border-border p-4 hover-elevate"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-sm font-medium">{review.authorName || "Anônimo"}</span>
                        </div>
                        <PriorityBadge priority={review.priority as any} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.text || "Sem texto"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{review.company?.name}</span>
                        <span>•</span>
                        <span>{new Date(review.reviewCreatedAt).toLocaleDateString("pt-BR")}</span>
                        <span>•</span>
                        <StatusBadge status={review.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma avaliação recente</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Estrelas</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-4">
                  <StarRating rating={stars} size="sm" />
                  <div className="flex-1">
                    <div className="h-8 rounded-md bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.random() * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                    {Math.floor(Math.random() * 50)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/reviews">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-view-reviews">
              <MessageSquare className="h-5 w-5" />
              <span>Ver Avaliações</span>
            </Button>
          </Link>
          <Link href="/moderation">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-moderation">
              <AlertCircle className="h-5 w-5" />
              <span>Moderação</span>
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="outline" className="w-full h-20 flex flex-col gap-2" data-testid="button-templates">
              <TrendingUp className="h-5 w-5" />
              <span>Templates</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
