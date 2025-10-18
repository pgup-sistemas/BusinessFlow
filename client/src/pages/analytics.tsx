import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { TrendingUp, MessageSquare, Clock, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/star-rating";

interface AnalyticsData {
  overview: {
    totalReviews: number;
    avgRating: number;
    responseRate: number;
    avgResponseTime: string;
  };
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  topTemplates: Array<{
    id: number;
    name: string;
    usageCount: number;
    avgConfidence: number;
  }>;
  trends: {
    reviewsGrowth: number;
    ratingImprovement: number;
  };
}

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics/dashboard"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Métricas e insights sobre o desempenho do sistema
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Avaliações"
            value={analytics.overview.totalReviews}
            icon={MessageSquare}
            trend={{ value: analytics.trends.reviewsGrowth, label: "vs. período anterior" }}
          />
          <StatCard
            title="Rating Médio"
            value={analytics.overview.avgRating.toFixed(1)}
            icon={Star}
            trend={{ value: analytics.trends.ratingImprovement, label: "vs. período anterior" }}
          />
          <StatCard
            title="Taxa de Resposta"
            value={`${analytics.overview.responseRate}%`}
            icon={TrendingUp}
          />
          <StatCard
            title="Tempo Médio"
            value={analytics.overview.avgResponseTime}
            icon={Clock}
            description="Tempo de resposta"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Ratings</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : analytics?.ratingDistribution ? (
              <div className="space-y-4">
                {analytics.ratingDistribution.map((item) => (
                  <div key={item.rating} className="flex items-center gap-4">
                    <StarRating rating={item.rating} size="sm" />
                    <div className="flex-1">
                      <div className="h-8 rounded-md bg-muted overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground mix-blend-difference">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sem dados disponíveis
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates Mais Usados</CardTitle>
            <CardDescription>Top 5 templates por utilização</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : analytics?.topTemplates && analytics.topTemplates.length > 0 ? (
              <div className="space-y-4">
                {analytics.topTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover-elevate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Confiança média: {(template.avgConfidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{template.usageCount}</p>
                      <p className="text-xs text-muted-foreground">usos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum template utilizado ainda
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Temporal</CardTitle>
          <CardDescription>Volume de avaliações ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Gráfico temporal será implementado em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
