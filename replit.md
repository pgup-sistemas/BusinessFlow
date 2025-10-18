# AI Vibe Code - Sistema de Gestão de Avaliações do Google Business

## Visão Geral
Sistema SaaS profissional multi-tenant para automatizar respostas às avaliações do Google Business Profile usando IA (Gemini). O sistema detecta novas avaliações, seleciona templates apropriados baseado em regras inteligentes, gera respostas personalizadas via IA, modera o conteúdo e publica automaticamente.

## Stack Tecnológica

### Frontend
- React 18 com TypeScript
- Tailwind CSS + Shadcn UI
- Wouter (routing)
- React Query (data fetching)
- React Hook Form (formulários)

### Backend
- Node.js + Express + TypeScript
- PostgreSQL (Neon)
- Drizzle ORM
- Replit Auth (autenticação)
- Gemini AI (geração de respostas)
- Google Business Profile API (OAuth2)

## Estrutura do Projeto

### Frontend (`client/src/`)
- **pages/**: Páginas principais do sistema
  - `landing.tsx`: Landing page para usuários não autenticados
  - `dashboard.tsx`: Dashboard executivo com métricas
  - `companies.tsx`: Gestão de empresas (multi-tenant)
  - `google-profiles.tsx`: Conexões OAuth com Google Business
  - `templates.tsx`: CRUD de templates de resposta
  - `reviews.tsx`: Listagem e filtro de avaliações
  - `moderation.tsx`: Fila de revisão humana
  - `analytics.tsx`: Métricas e relatórios
  - `settings.tsx`: Configurações do usuário

- **components/**: Componentes reutilizáveis
  - `app-sidebar.tsx`: Navegação lateral
  - `theme-toggle.tsx`: Alternância dark/light mode
  - `stat-card.tsx`: Card de estatísticas
  - `priority-badge.tsx`: Badge de prioridade (URGENT/HIGH/NORMAL/LOW)
  - `star-rating.tsx`: Componente de estrelas
  - `status-badge.tsx`: Badge de status (pending/sent/failed/blocked)

### Backend (`server/`)
- **routes.ts**: Definição de endpoints da API
- **storage.ts**: Interface de storage e implementações
- **replitAuth.ts**: Configuração do Replit Auth (OAuth2 + Session)
- **db.ts**: Configuração do Drizzle ORM

### Shared (`shared/`)
- **schema.ts**: Modelos de dados compartilhados (Drizzle + Zod)
  - `users`: Usuários do sistema (Replit Auth)
  - `companies`: Empresas (multi-tenant)
  - `googleProfiles`: Perfis conectados ao Google Business
  - `templates`: Templates de resposta com placeholders
  - `reviews`: Avaliações do Google Business
  - `responses`: Respostas geradas pela IA
  - `templateCooldowns`: Controle de cooldown de templates
  - `auditLogs`: Log de auditoria

## Funcionalidades Principais

### 1. Multi-Tenant
- Suporte a múltiplas empresas
- Cada empresa pode ter múltiplos perfis do Google Business
- Isolamento completo de dados por empresa

### 2. Integração Google Business
- OAuth2 flow para conectar perfis
- Armazenamento seguro de tokens (criptografados)
- Refresh automático de access tokens
- Sincronização de avaliações

### 3. Motor de Regras Inteligente
Seleção de templates baseada em:
- Rating (1-5 estrelas)
- Sentimento da avaliação
- Keywords obrigatórias (AND)
- Keywords excludentes (OR)
- Prioridade (desempate)
- Cooldown (tempo entre reusos)
- Idioma

### 4. Geração com IA (Gemini)
- Substituição de placeholders dinâmicos:
  - `{{author_name}}`: Nome do avaliador
  - `{{company_name}}`: Nome da empresa
  - `{{rating}}`: Número de estrelas
  - `{{issue}}`: Problema mencionado
  - `{{positive_point}}`: Elogio mencionado
- Prompt estruturado com contexto
- Temperature: 0.7 (balanceado)
- Fallback para template puro em caso de falha

### 5. Sistema de Moderação
Flags automáticas:
- `inappropriate_language`: Linguagem inadequada
- `tone_mismatch`: Tom incompatível com rating
- `too_long`/`too_short`: Tamanho inválido
- `sensitive_data`: Dados pessoais detectados
- `low_confidence`: Confiança da IA < 0.7

Ações:
- **BLOCK**: Bloquear publicação → fila de revisão humana
- **WARN**: Publicar mas alertar admin
- **PASS**: Publicar normalmente

### 6. Fila de Revisão Humana
Interface para:
- Aprovar e publicar
- Editar e publicar versão editada
- Rejeitar e regenerar com outro template

### 7. Analytics
Métricas em tempo real:
- Total de avaliações processadas
- Taxa de resposta (%)
- Tempo médio de resposta
- Distribuição de estrelas
- Templates mais usados
- Taxa de erro

## Variáveis de Ambiente

```bash
# Database (provisionado automaticamente)
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=...
PGDATABASE=...
PGUSER=...
PGPASSWORD=...

# Replit Auth (provisionado automaticamente)
REPL_ID=...
REPLIT_DOMAINS=...
SESSION_SECRET=...

# Gemini AI
GEMINI_API_KEY=AIza...

# Google OAuth2 (para Google Business Profile API)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=https://${REPLIT_DOMAINS}/api/oauth2/callback
```

## Fluxo de Dados

### 1. Inicialização
1. Admin faz login via Replit Auth
2. Cria empresa no sistema
3. Conecta perfil do Google Business via OAuth2
4. Tokens salvos criptografados no banco

### 2. Detecção de Avaliações
1. Worker sincroniza avaliações periodicamente (5 min)
2. Calcula prioridade (URGENT/HIGH/NORMAL/LOW)
3. Analisa sentimento e detecta idioma
4. Salva como `Review` com status='pending'

### 3. Processamento
1. Seleciona template usando motor de regras
2. Substitui placeholders no template
3. Gera resposta personalizada com Gemini
4. Modera resposta (flags)
5. Salva como `Response`

### 4. Publicação
1. Se aprovado automaticamente → publica via Google API
2. Se bloqueado → envia para fila de revisão humana
3. Admin aprova/edita/rejeita manualmente

## Design System

### Cores (Light Mode)
- **Primary**: Deep purple-blue (263° 70% 50%)
- **Success**: Green (142° 71% 45%)
- **Warning**: Orange (38° 92% 50%)
- **Danger**: Red (0° 84% 60%)
- **Info**: Blue (221° 83% 53%)

### Tipografia
- **Font Family**: Inter (corpo), JetBrains Mono (código)
- **Scale**: Display (36px), H1 (30px), H2 (24px), H3 (18px), Body (14-16px)

### Componentes
- Sidebar fixa com 16rem de largura
- Cards com hover elevation
- Badges semânticos por status/prioridade
- Skeleton loaders para estados de carregamento
- Toast notifications para feedback

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor (frontend + backend)

# Database
npm run db:push          # Sincroniza schema com DB (sem migrações)
npm run db:push --force  # Força sincronização (cuidado!)
npm run db:studio        # Abre Drizzle Studio (interface visual)

# Build
npm run build            # Build de produção
```

## Segurança

1. **Tokens OAuth**: Criptografados com AES-256 antes de salvar
2. **Secrets**: Gerenciados via Replit Secrets (nunca hardcoded)
3. **Rate Limiting**: Implementado em endpoints públicos
4. **CSRF**: Protegido via SameSite cookies
5. **Audit Log**: Todas ações sensíveis registradas

## Próximos Passos (Fase 2)

- [ ] Webhooks do Google Business (substituir polling)
- [ ] Processamento assíncrono com filas (Bull/BullMQ)
- [ ] A/B testing de templates
- [ ] Relatórios PDF/CSV
- [ ] Sistema de alertas (Slack/Email)
- [ ] API pública REST com documentação Swagger

## Notas Importantes

- O sistema está em modo MVP - foco em funcionalidades core
- Todas as features estão funcionais end-to-end
- Interface profissional seguindo design guidelines
- Pronto para comercialização como SaaS
