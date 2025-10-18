import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, CheckCircle2, XCircle, RefreshCw, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { GoogleProfile, Company } from "@shared/schema";

interface GoogleProfileWithCompany extends GoogleProfile {
  company: Company;
}

export default function GoogleProfiles() {
  const { toast } = useToast();

  const { data: profiles, isLoading } = useQuery<GoogleProfileWithCompany[]>({
    queryKey: ["/api/google-profiles"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const connectMutation = useMutation({
    mutationFn: async (companyId: number) => {
      window.location.href = `/api/connect/google?company_id=${companyId}`;
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return await apiRequest("POST", `/api/google-profiles/${profileId}/refresh`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-profiles"] });
      toast({
        title: "Sucesso",
        description: "Token atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar token",
        variant: "destructive",
      });
    },
  });

  const handleConnect = (companyId: number) => {
    connectMutation.mutate(companyId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfis do Google Business</h1>
          <p className="text-muted-foreground">
            Gerencie as conexões OAuth2 com o Google Business Profile
          </p>
        </div>
      </div>

      {companies && companies.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Conectar Nova Empresa
            </CardTitle>
            <CardDescription>
              Selecione uma empresa para conectar ao Google Business Profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {companies.map((company) => (
                <Button
                  key={company.id}
                  variant="outline"
                  onClick={() => handleConnect(company.id)}
                  data-testid={`button-connect-company-${company.id}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {company.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : profiles && profiles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => {
            const isTokenValid = profile.tokenExpiry && new Date(profile.tokenExpiry) > new Date();
            
            return (
              <Card key={profile.id} className="hover-elevate" data-testid={`card-profile-${profile.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{profile.profileName}</CardTitle>
                      <CardDescription className="text-xs">
                        {profile.company.name}
                      </CardDescription>
                    </div>
                    <Badge variant={profile.isActive ? "default" : "secondary"}>
                      {profile.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status OAuth:</span>
                      {isTokenValid ? (
                        <Badge variant="outline" className="bg-chart-2/10 text-chart-2 border-chart-2/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                          <XCircle className="mr-1 h-3 w-3" />
                          Expirado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Última Sync:</span>
                      <span className="font-medium">
                        {profile.lastSyncAt
                          ? new Date(profile.lastSyncAt).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground">Location ID:</span>
                      <span className="font-mono text-xs truncate flex-1 text-right">
                        {profile.googleLocationId}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isTokenValid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConnect(profile.companyId)}
                        data-testid={`button-reconnect-${profile.id}`}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Reconectar
                      </Button>
                    )}
                    {isTokenValid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => refreshMutation.mutate(profile.id)}
                        disabled={refreshMutation.isPending}
                        data-testid={`button-refresh-${profile.id}`}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Atualizar
                      </Button>
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
            <Link2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum perfil conectado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">
              Conecte sua primeira empresa ao Google Business Profile para começar a gerenciar avaliações
            </p>
            {companies && companies.length > 0 && (
              <Button onClick={() => handleConnect(companies[0].id)} data-testid="button-connect-first">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Google Business
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
