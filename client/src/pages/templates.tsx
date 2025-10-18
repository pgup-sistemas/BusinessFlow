import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Edit, Trash2, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Template, InsertTemplate, Company } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTemplateSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface TemplateWithCompany extends Template {
  company: Company;
}

export default function Templates() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery<TemplateWithCompany[]>({
    queryKey: ["/api/templates"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const form = useForm<InsertTemplate>({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      body: "",
      tone: "neutro",
      minRating: 1,
      maxRating: 5,
      priority: 0,
      keywordsRequired: [],
      keywordsExcluded: [],
      cooldownHours: 24,
      language: "pt-BR",
      isActive: true,
      companyId: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTemplate) => {
      return await apiRequest("POST", "/api/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Sucesso",
        description: "Template criado com sucesso",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/templates/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Sucesso",
        description: "Template removido com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover template",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTemplate) => {
    createMutation.mutate(data);
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    form.reset({
      ...template,
      keywordsRequired: Array.isArray(template.keywordsRequired) ? template.keywordsRequired : [],
      keywordsExcluded: Array.isArray(template.keywordsExcluded) ? template.keywordsExcluded : [],
    });
    setDialogOpen(true);
  };

  const toneConfig: Record<string, { label: string; color: string }> = {
    positivo: { label: "Positivo", color: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
    neutro: { label: "Neutro", color: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
    empatico: { label: "Empático", color: "bg-primary/10 text-primary border-primary/20" },
    recuperacao: { label: "Recuperação", color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Gerencie templates de respostas com placeholders e configurações avançadas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingTemplate(null); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-template">
              <Plus className="mr-2 h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Editar Template" : "Criar Novo Template"}</DialogTitle>
              <DialogDescription>
                Configure um template com placeholders como {{author_name}}, {{company_name}}, {{rating}}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Template 5 Estrelas" {...field} data-testid="input-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger data-testid="select-company">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies?.map((company) => (
                              <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Corpo do Template</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Olá {{author_name}}, agradecemos sua avaliação de {{rating}} estrelas!"
                          className="min-h-[120px] font-mono text-sm"
                          {...field}
                          data-testid="input-template-body"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Use: {{author_name}}, {{company_name}}, {{rating}}, {{issue}}, {{positive_point}}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tom</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-tone">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="positivo">Positivo</SelectItem>
                            <SelectItem value="neutro">Neutro</SelectItem>
                            <SelectItem value="empatico">Empático</SelectItem>
                            <SelectItem value="recuperacao">Recuperação</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-priority" />
                        </FormControl>
                        <FormDescription className="text-xs">Maior = mais prioritário</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating Mínimo</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={5} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-min-rating" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating Máximo</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={5} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-max-rating" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cooldownHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cooldown (horas)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-cooldown" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Tempo mínimo entre reutilizações do template
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingTemplate(null); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-template">
                    {createMutation.isPending ? "Salvando..." : editingTemplate ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {template.company?.name || "Empresa desconhecida"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={toneConfig[template.tone]?.color || ""}>
                      {toneConfig[template.tone]?.label || template.tone}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-mono text-muted-foreground line-clamp-3">
                    {template.body}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium">{template.minRating}-{template.maxRating}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Prioridade:</span>
                    <span className="font-medium ml-1.5">{template.priority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usado:</span>
                    <span className="font-medium ml-1.5">{template.usageCount}x</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cooldown:</span>
                    <span className="font-medium ml-1.5">{template.cooldownHours}h</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditDialog(template)}
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">
              Crie templates personalizados com placeholders para gerar respostas automáticas
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-template">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
