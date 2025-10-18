import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Sparkles, Shield, Zap, TrendingUp, Building2 } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <nav className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">AI Vibe Code</h1>
              <p className="text-xs text-muted-foreground">Gestão Inteligente de Avaliações</p>
            </div>
          </div>
          <Button onClick={handleLogin} data-testid="button-login">
            Entrar
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Powered by Gemini AI
          </div>
          
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
            Automatize Respostas às Avaliações do Google Business
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema profissional para gerenciar múltiplas empresas, gerar respostas personalizadas com IA 
            e melhorar sua reputação online em minutos, não dias.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <Button size="lg" onClick={handleLogin} className="h-12 px-8" data-testid="button-get-started">
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8">
              Saiba Mais
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-16">
            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">IA Inteligente</h3>
                <p className="text-sm text-muted-foreground">
                  Motor de regras avançado seleciona templates baseado em estrelas, sentimento, 
                  keywords e prioridade para respostas perfeitas.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2 mb-4">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Moderação Automática</h3>
                <p className="text-sm text-muted-foreground">
                  Sistema de flags detecta linguagem inadequada, tom incompatível e dados 
                  sensíveis antes de publicar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3 mb-4">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Resposta Rápida</h3>
                <p className="text-sm text-muted-foreground">
                  Reduza o tempo de resposta de dias para minutos. Priorização automática 
                  de avaliações críticas (1-2 estrelas).
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4 mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-Empresa</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie múltiplas empresas e perfis do Google Business em uma única 
                  plataforma profissional.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5 mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Analytics Completo</h3>
                <p className="text-sm text-muted-foreground">
                  Métricas em tempo real: taxa de resposta, distribuição de estrelas, 
                  tempo médio e performance de templates.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 hover-elevate">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Templates Personalizados</h3>
                <p className="text-sm text-muted-foreground">
                  CRUD completo com configurações avançadas: tone, ratings, keywords, 
                  cooldown e idioma.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 rounded-lg bg-primary/5 border border-primary/20 p-8">
            <h3 className="text-2xl font-bold mb-4">Pronto para Transformar sua Gestão de Avaliações?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Junte-se a empresas que já automatizaram suas respostas e melhoraram sua reputação online.
            </p>
            <Button size="lg" onClick={handleLogin} className="h-12 px-8" data-testid="button-cta">
              Começar Gratuitamente
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 AI Vibe Code. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
