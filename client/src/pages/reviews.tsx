import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/star-rating";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import type { Review, GoogleProfile, Company } from "@shared/schema";

interface ReviewWithRelations extends Review {
  profile: GoogleProfile & { company: Company };
  response?: {
    id: number;
    responseText: string;
    status: string;
  };
}

export default function Reviews() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reviews, isLoading } = useQuery<ReviewWithRelations[]>({
    queryKey: ["/api/reviews", { status: statusFilter, priority: priorityFilter, search: searchTerm }],
  });

  const filteredReviews = reviews?.filter((review) => {
    const matchesSearch = !searchTerm ||
      review.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.text?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || review.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || review.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avaliações</h1>
          <p className="text-muted-foreground">
            Gerencie e processe avaliações do Google Business
          </p>
        </div>
        <Button
          onClick={() => {
            const pendingReviewIds = reviews
              ?.filter((r: any) => r.status === "pending")
              .map((r: any) => r.id) || [];

            if (pendingReviewIds.length === 0) {
              toast({
                title: "Nenhuma avaliação pendente",
                description: "Não há avaliações pendentes para processar",
              });
              return;
            }

            fetch("/api/reviews/batch-process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reviewIds: pendingReviewIds }),
            })
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
                toast({
                  title: "Processamento iniciado",
                  description: `${pendingReviewIds.length} avaliações sendo processadas`,
                });
              })
              .catch(() => {
                toast({
                  title: "Erro",
                  description: "Falha ao processar avaliações em lote",
                  variant: "destructive",
                });
              });
          }}
        >
          Processar Todas Pendentes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Refine a busca de avaliações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por autor ou texto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-reviews"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger data-testid="select-priority-filter">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredReviews && filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className="border-l-4 hover-elevate"
              style={{
                borderLeftColor:
                  review.priority === "URGENT" ? "hsl(var(--destructive))" :
                  review.priority === "HIGH" ? "hsl(var(--chart-3))" :
                  review.priority === "NORMAL" ? "hsl(var(--chart-4))" :
                  "hsl(var(--chart-2))"
              }}
              data-testid={`card-review-${review.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} size="md" showNumber />
                      <span className="font-semibold">{review.authorName || "Anônimo"}</span>
                      <PriorityBadge priority={review.priority as any} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{review.profile?.company?.name || "Empresa"}</span>
                      <span>•</span>
                      <span>{review.profile?.profileName || "Perfil"}</span>
                      <span>•</span>
                      <span>{new Date(review.reviewCreatedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <StatusBadge status={review.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {review.text && (
                  <div className="rounded-md bg-muted/50 p-4">
                    <p className="text-sm leading-relaxed">{review.text}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sentimento:</span>
                    <span className="ml-2 font-medium">
                      {review.sentimentScore !== null && review.sentimentScore !== undefined
                        ? review.sentimentScore > 0.5
                          ? "Positivo"
                          : review.sentimentScore < -0.3
                          ? "Negativo"
                          : "Neutro"
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Idioma:</span>
                    <span className="ml-2 font-medium uppercase">
                      {review.languageDetected || "N/A"}
                    </span>
                  </div>
                </div>

                {review.response && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-primary">Resposta Gerada:</span>
                      <StatusBadge status={review.response.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.response.responseText}
                    </p>
                  </div>
                )}

                {review.errorMessage && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-xs text-destructive font-mono">{review.errorMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação encontrada</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Tente ajustar os filtros"
                : "Conecte um perfil do Google Business para começar"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}