
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowLeft, Link2, Save, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, GoogleProfile } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface GoogleProfileWithCompany extends GoogleProfile {
  company: Company;
}

export default function CompanySettings() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${id}`],
    enabled: !!id,
  });

  const { data: googleProfiles, isLoading: isLoadingProfiles } = useQuery<GoogleProfileWithCompany[]>({
    queryKey: ["/api/google-profiles"],
  });

  const form = useForm({
    resolver: zodResolver(insertCompanySchema),
    values: company ? {
      name: company.name,
      slug: company.slug,
      isActive: company.isActive,
      settings: company.settings || {},
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/companies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Sucesso",
        description: "Configurações atualizadas com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar configurações",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/companies/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Sucesso",
        description: "Empresa removida com sucesso",
      });
      navigate("/companies");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover empresa",
        variant: "destructive",
      });
    },
  });

  const disconnectProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return await apiRequest("DELETE", `/api/google-profiles/${profileId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-profiles"] });
      toast({
        title: "Sucesso",
        description: "Perfil desconectado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao desconectar perfil",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  const handleConnectGoogle = () => {
    if (id) {
      window.location.href = `/api/connect/google?company_id=${id}`;
    }
  };

  const syncReviewsMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return await apiRequest("POST", `/api/google-profiles/${profileId}/sync`, undefined);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-profiles"] });
      toast({
        title: "Sucesso",
        description: `${data.reviewCount} avaliações sincronizadas`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar avaliações",
        variant: "destructive",
      });
    },
  });

  const handleSyncReviews = (profileId: number) => {
    syncReviewsMutation.mutate(profileId);
  };

  const companyProfiles = googleProfiles?.filter(p => p.companyId === parseInt(id || "0")) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Empresa não encontrada</h3>
          <Button onClick={() => navigate("/companies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Empresas
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
            <p className="text-muted-foreground">Configurações da empresa</p>
          </div>
        </div>
        <Badge variant={company.isActive ? "default" : "secondary"}>
          {company.isActive ? "Ativa" : "Inativa"}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="google">Google Business</TabsTrigger>
          <TabsTrigger value="danger">Zona de Perigo</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Edite as informações básicas da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>Nome completo da empresa</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>Identificador único da empresa</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Empresa Ativa</FormLabel>
                          <FormDescription>
                            Desative para pausar o processamento de avaliações
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conectar ao Google Business Profile</CardTitle>
              <CardDescription>
                Configure a conexão OAuth2 para sincronizar avaliações do Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleConnectGoogle} className="w-full">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Nova Conta Google
              </Button>
            </CardContent>
          </Card>

          {isLoadingProfiles ? (
            <Skeleton className="h-48" />
          ) : companyProfiles.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Perfis Conectados</CardTitle>
                <CardDescription>
                  Gerencie as conexões existentes do Google Business Profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyProfiles.map((profile) => {
                  const isTokenValid = profile.tokenExpiry && new Date(profile.tokenExpiry) > new Date();
                  
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{profile.profileName}</h4>
                          <Badge variant={isTokenValid ? "default" : "destructive"}>
                            {isTokenValid ? "Conectado" : "Token Expirado"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          Location ID: {profile.googleLocationId}
                        </p>
                        {profile.lastSyncAt && (
                          <p className="text-xs text-muted-foreground">
                            Última sincronização: {new Date(profile.lastSyncAt).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncReviews(profile.id)}
                          disabled={!isTokenValid}
                        >
                          Sincronizar
                        </Button>
                        {!isTokenValid && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnectGoogle}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            Reconectar
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Desconexão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja desconectar este perfil? Todas as avaliações
                                vinculadas serão mantidas, mas novas sincronizações não ocorrerão.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => disconnectProfileMutation.mutate(profile.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Desconectar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum perfil conectado</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Conecte esta empresa ao Google Business Profile para começar
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>
                Ações irreversíveis que afetam permanentemente esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Empresa Permanentemente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente a empresa
                      <span className="font-bold"> {company.name}</span>, todos os perfis do Google
                      conectados, avaliações, templates e respostas associadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, excluir permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
