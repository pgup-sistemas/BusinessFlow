import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, XCircle, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/star-rating";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { Response, Review } from "@shared/schema";

interface ModerationItem extends Response {
  review: Review & {
    profile: {
      company: { name: string };
      profileName: string;
    };
  };
}

export default function Moderation() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState("");

  const { data: pendingItems, isLoading } = useQuery<ModerationItem[]>({
    queryKey: ["/api/moderation/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/responses/${id}/approve`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/pending"] });
      toast({
        title: "Sucesso",
        description: "Resposta aprovada e publicada",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar resposta",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/responses/${id}/reject`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/pending"] });
      toast({
        title: "Sucesso",
        description: "Resposta rejeitada. Uma nova será gerada.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar resposta",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      return await apiRequest("PUT", `/api/responses/${id}/edit`, { editedVersion: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/pending"] });
      toast({
        title: "Sucesso",
        description: "Resposta editada e publicada",
      });
      setEditingId(null);
      setEditedText("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao editar resposta",
        variant: "destructive",
      });
    },
  });

  const startEditing = (item: ModerationItem) => {
    setEditingId(item.id);
    setEditedText(item.responseText);
  };

  const saveEdit = (id: number) => {
    editMutation.mutate({ id, text: editedText });
  };

  const flagConfig: Record<string, { label: string; color: string }> = {
    inappropriate_language: { label: "Linguagem Inadequada", color: "destructive" },
    tone_mismatch: { label: "Tom Incompatível", color: "chart-3" },
    too_long: { label: "Muito Longo", color: "chart-4" },
    too_short: { label: "Muito Curto", color: "chart-4" },
    sensitive_data: { label: "Dados Sensíveis", color: "destructive" },
    low_confidence: { label: "Baixa Confiança", color: "chart-3" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderação</h1>
          <p className="text-muted-foreground">
            Revise e aprove respostas bloqueadas pelo sistema de moderação
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {pendingItems?.length || 0} pendentes
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : pendingItems && pendingItems.length > 0 ? (
        <div className="space-y-6">
          {pendingItems.map((item) => {
            const flags = Array.isArray(item.moderationFlags) ? item.moderationFlags : [];
            const isEditing = editingId === item.id;
            
            return (
              <Card key={item.id} className="border-destructive/30" data-testid={`card-moderation-${item.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-lg">Resposta Bloqueada</CardTitle>
                      </div>
                      <CardDescription>
                        {item.review?.profile?.company?.name} • {item.review?.profile?.profileName}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {flags.map((flag, index) => {
                        const config = flagConfig[flag as string] || { label: flag, color: "muted" };
                        return (
                          <Badge key={index} variant="outline" className={`bg-${config.color}/10 text-${config.color} border-${config.color}/20`}>
                            {config.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Avaliação Original</h4>
                      <div className="rounded-md bg-muted/50 p-4 space-y-3">
                        <StarRating rating={item.review?.rating || 0} size="sm" showNumber />
                        <p className="text-sm">{item.review?.text || "Sem texto"}</p>
                        <p className="text-xs text-muted-foreground">
                          Por {item.review?.authorName || "Anônimo"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground">Resposta Gerada</h4>
                        {item.confidenceScore && (
                          <Badge variant="outline" className="text-xs">
                            Confiança: {(item.confidenceScore * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      {isEditing ? (
                        <Textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="min-h-[120px]"
                          data-testid={`textarea-edit-${item.id}`}
                        />
                      ) : (
                        <div className="rounded-md bg-primary/5 border border-primary/20 p-4">
                          <p className="text-sm">{item.responseText}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => saveEdit(item.id)}
                          disabled={editMutation.isPending}
                          className="flex-1"
                          data-testid={`button-save-edit-${item.id}`}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {editMutation.isPending ? "Salvando..." : "Salvar e Publicar"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditedText("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => approveMutation.mutate(item.id)}
                          disabled={approveMutation.isPending}
                          variant="default"
                          className="flex-1 bg-chart-2 hover:bg-chart-2/90"
                          data-testid={`button-approve-${item.id}`}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {approveMutation.isPending ? "Aprovando..." : "Aprovar e Publicar"}
                        </Button>
                        <Button
                          onClick={() => startEditing(item)}
                          variant="outline"
                          className="flex-1"
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => rejectMutation.mutate(item.id)}
                          disabled={rejectMutation.isPending}
                          variant="outline"
                          className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          data-testid={`button-reject-${item.id}`}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar"}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma resposta pendente</h3>
            <p className="text-sm text-muted-foreground max-w-md text-center">
              Todas as respostas foram aprovadas ou não há itens bloqueados no momento
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
