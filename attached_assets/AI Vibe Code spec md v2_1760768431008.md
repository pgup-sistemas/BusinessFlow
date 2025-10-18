# AI Vibe Code — spec.md v2.0

## 1. Visão Geral
Sistema automatizado para gerenciar e responder avaliações do Google Business Profile usando IA (Gemini API). O sistema detecta novas avaliações, seleciona templates apropriados baseado em regras inteligentes, gera respostas personalizadas via IA, modera o conteúdo e publica automaticamente.

*****Alphaclin-zona-norte******
Chave de API criada
Transfira esta chave com o parâmetro key=API_KEY para usá-la no seu aplicativo.
Sua chave de API
AIzaSyAWvg80kmi9ixKtizHEIO7e8tGHp5P9LQU

IDS do cliente O|Auth 2.0
Cliente OAuth criado
O ID do cliente está sempre disponível na guia Clientes da plataforma de autenticação do Google.

O acesso OAuth é restrito aos usuários de teste  listados na tela de consentimento do OAuth.
ID do cliente:
37890042726-6qv6v1bkkpfjg19jj5fgquodu0rojbrv.apps.googleusercontent.com
A partir de junho de 2025, não será mais possível acessar ou fazer o download da chave secreta do cliente depois que esta caixa de diálogo for fechada. Copie ou faça o download das informações abaixo e armazene-as em um local seguro.
Chave secreta do cliente:
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

*****Google meu negocio************

ID do Perfil da Empresa
Pediremos essa informação se você entrar em contato com o suporte
ID: 1295712302549628615

****************************************************************

## 2. Objetivos
- Reduzir tempo de resposta para avaliações de dias para minutos
- Manter consistência e qualidade nas respostas
- Personalizar cada resposta mantendo tom profissional
- Priorizar avaliações críticas (1-2 estrelas)
- Garantir segurança e moderação antes da publicação
- Fornecer analytics e aprendizado contínuo

## 3. Princípios de Design
- **Simplicidade**: código limpo, fácil manutenção
- **Robustez**: tolerar falhas externas (APIs, rede)
- **Segurança**: moderação obrigatória, dados criptografados
- **Observabilidade**: logs, métricas, alertas claros
- **Escalabilidade**: suportar múltiplas empresas/perfis


## 4. Stack Tecnológica

### Backend
- **Framework**: Python 3.10+ com Flask
- **Fila Assíncrona**: Celery + Redis/RabbitMQ
- **Banco de Dados**: PostgreSQL 14+
- **Cache**: Redis
- **ORM**: SQLAlchemy + Flask-Migrate

### Frontend
- **UI**: Flask templates + Tailwind CSS 3.x
- **Dashboard**: Charts.js para analytics
- **Notificações**: Toast/alerts em tempo real

### APIs e Integrações
- **IA**: Gemini API (Google Generative AI)
- **Google**: Google Business Profile API (OAuth2)
- **Análise**: TextBlob ou VADER (sentimento local)
- **Moderação**: Filtro customizado + flags

### Observabilidade
- **Erros**: Sentry
- **Logs**: Structured logging (JSON)
- **Métricas**: Prometheus + Grafana (opcional)
- **Alertas**: Slack/Email webhooks

### Documentação
- **API Docs**: Swagger/Flasgger
- **Deploy**: Railway, Render, AWS/GCP (Docker)


## 5. Requisitos Funcionais

### 5.1 Autenticação e Autorização
- [RF-001] OAuth2 para conectar perfil Google Business
- [RF-002] Armazenar refresh_token criptografado (Fernet)
- [RF-003] Refresh automático de access_token
- [RF-004] Suporte a múltiplas contas Google por empresa
- [RF-005] Sistema de permissões (admin, moderador, viewer)

### 5.2 Detecção de Avaliações
- [RF-006] Worker Celery para polling periódico (intervalo configurável)
- [RF-007] Webhook endpoint para notificações Google (fallback)
- [RF-008] Detecção de duplicatas (google_review_id único)
- [RF-009] Análise de sentimento prévia (TextBlob/VADER)
- [RF-010] Detecção de idioma da avaliação
- [RF-011] Classificação de prioridade:
  - **URGENT**: 1-2 estrelas + palavras críticas
  - **HIGH**: 1-2 estrelas gerais
  - **NORMAL**: 3-4 estrelas
  - **LOW**: 5 estrelas

### 5.3 Seleção de Template
- [RF-012] Motor de regras multi-camada:
  1. **Estrelas**: 1-2 → recuperação, 3 → neutro, 4-5 → agradecimento
  2. **Sentimento**: score < -0.3 → negativo, > 0.5 → positivo
  3. **Keywords obrigatórias**: template só selecionado se review contém palavras específicas
  4. **Keywords excludentes**: template descartado se review contém palavras proibidas
  5. **Prioridade**: desempate por campo `priority` do template
  6. **Cooldown**: não repetir mesmo template em N horas para mesmo perfil
  
- [RF-013] Fallback: se nenhum template matchear, usar template genérico padrão
- [RF-014] Logs detalhados da decisão de seleção

### 5.4 Geração de Resposta
- [RF-015] Substituição de placeholders antes de enviar ao Gemini:
  - `{{author_name}}`: nome do avaliador
  - `{{company_name}}`: nome da empresa
  - `{{issue}}`: problema mencionado (extraído via NLP básico)
  - `{{positive_point}}`: elogio mencionado
  - `{{rating}}`: número de estrelas
  - `{{location}}`: localização do perfil
  
- [RF-016] Prompt estruturado para Gemini com contexto:
  ```
  System: Você é assistente que escreve respostas profissionais para avaliações do Google Business.
  Tom: {template.tone}
  Limite: 100 palavras
  Contexto: Avaliação {rating} estrelas de {author_name}: "{review_text}"
  Template base: {processed_template}
  
  Tarefa: Gere resposta natural, cordial e personalizada.
  ```

- [RF-017] Configurações Gemini:
  - `temperature`: 0.7 (balanceado)
  - `max_output_tokens`: 256
  - `timeout`: 10 segundos
  
- [RF-018] Retry com backoff exponencial (3 tentativas)
- [RF-019] Fallback: se Gemini falhar, usar template puro (sem IA)
- [RF-020] Armazenar confidence_score do modelo

### 5.5 Moderação (CRÍTICO)
- [RF-021] Sistema de moderação obrigatório antes de publicar:
  - **Palavras proibidas**: lista customizável de termos inadequados
  - **Tom inadequado**: detectar contradições (ex: "parabéns" em review 1 estrela)
  - **Tamanho**: validar limite de 4096 caracteres (Google)
  - **Menções**: detectar dados sensíveis (emails, telefones não autorizados)
  - **Compliance**: checar se resposta segue diretrizes Google
  
- [RF-022] Sistema de flags:
  - `inappropriate_language`: linguagem imprópria
  - `tone_mismatch`: tom não condiz com rating
  - `too_long`: excede limite
  - `sensitive_data`: contém dados pessoais
  - `low_confidence`: Gemini com score < 0.7
  
- [RF-023] Ações por flag:
  - **BLOCK**: não publicar, enviar para revisão humana
  - **WARN**: publicar mas alertar admin
  - **PASS**: publicar normalmente
  
- [RF-024] Fila de revisão humana para casos bloqueados

### 5.6 Publicação
- [RF-025] POST para Google Business Profile API: `accounts/{accountId}/locations/{locationId}/reviews:reply`
- [RF-026] Circuit breaker: após 3 falhas consecutivas, pausar publicações por 5 minutos
- [RF-027] Rate limiting: máximo N respostas/hora por perfil (configurável)
- [RF-028] Confirmação de publicação e armazenamento de `published_at`
- [RF-029] Retry automático para erros 5xx (3 tentativas)

### 5.7 Painel e Gestão
- [RF-030] Dashboard com métricas:
  - Total avaliações processadas (hoje/semana/mês)
  - Taxa de resposta (% respondidas)
  - Tempo médio de resposta
  - Distribuição de estrelas
  - Taxa de erro
  - Fila atual (pending items)
  
- [RF-031] Histórico paginado das últimas 100 respostas
- [RF-032] Busca por: google_review_id, author_name, data, rating
- [RF-033] Filtros: status (pending/sent/failed/blocked), prioridade
- [RF-034] Ação manual: aprovar/rejeitar/editar resposta bloqueada
- [RF-035] Reenvio manual de respostas falhadas

### 5.8 Gestão de Templates
- [RF-036] CRUD completo de templates (admin only)
- [RF-037] Campos do template:
  - `name`: identificação interna
  - `body`: texto com placeholders
  - `tone`: positivo/neutro/empático/recuperação
  - `min_rating`, `max_rating`: range de estrelas (1-5)
  - `priority`: número de desempate (maior = prioritário)
  - `keywords_required`: JSON array (review deve conter)
  - `keywords_excluded`: JSON array (review não pode conter)
  - `cooldown_hours`: tempo mínimo entre usos no mesmo perfil
  - `is_active`: habilitar/desabilitar
  - `language`: pt-BR, en-US, es-ES
  
- [RF-038] Preview/test de template com dados mockados
- [RF-039] Histórico de uso: quantas vezes usado, última vez
- [RF-040] Importação em lote (JSON/CSV)

### 5.9 Analytics e Aprendizado
- [RF-041] Tracking de efetividade:
  - `user_feedback`: good/bad/edited (input manual admin)
  - `edited_version`: se admin editou antes de publicar
  - `engagement_score`: se review gerou resposta do cliente
  
- [RF-042] Relatório semanal:
  - Templates mais usados
  - Templates com mais edições (indicador de problema)
  - Tempo médio de resposta por prioridade
  
- [RF-043] A/B testing (Fase 2): testar 2 templates para mesmo cenário


## 6. Requisitos Não-Funcionais

### 6.1 Segurança
- [RNF-001] Tokens OAuth2 criptografados (Fernet) at rest
- [RNF-002] Secrets em variáveis de ambiente ou Vault (nunca hardcoded)
- [RNF-003] TLS/HTTPS obrigatório em produção
- [RNF-004] Rate limiting em todos endpoints públicos
- [RNF-005] Logs sanitizados (sem tokens completos, max 4 chars)
- [RNF-006] RBAC: admin, moderator, viewer
- [RNF-007] Audit log de todas ações sensíveis

### 6.2 Performance
- [RNF-008] Processar até 100 avaliações/minuto (MVP: 10/min)
- [RNF-009] Tempo médio de geração < 5 segundos (polling → resposta publicada)
- [RNF-010] Cache Redis para templates processados (TTL 1h)
- [RNF-011] Queries DB otimizadas (índices em foreign keys, timestamps)
- [RNF-012] Timeout de 10s para chamadas Gemini

### 6.3 Confiabilidade
- [RNF-013] Uptime 99.5% (MVP), 99.9% (produção)
- [RNF-014] Retry exponencial: 1s, 5s, 15s
- [RNF-015] Dead Letter Queue para falhas irrecuperáveis
- [RNF-016] Circuit breaker para serviços externos
- [RNF-017] Backup automático DB (diário)
- [RNF-018] Disaster recovery plan documentado

### 6.4 Observabilidade
- [RNF-019] Logs estruturados JSON com correlation_id
- [RNF-020] Níveis: DEBUG, INFO, WARN, ERROR, CRITICAL
- [RNF-021] Métricas expostas:
  - `reviews_processed_total` (counter)
  - `reviews_pending` (gauge)
  - `gemini_latency_seconds` (histogram)
  - `errors_total` (counter por tipo)
  
- [RNF-022] Alertas automáticos:
  - Taxa de erro > 5% em 10 minutos
  - Fila > 100 itens por 30 minutos
  - Gemini timeout > 50% em 5 minutos
  - Sem processamento por 1 hora (worker down)
  
- [RNF-023] Integração com Sentry para exception tracking
- [RNF-024] Dashboard Grafana (opcional) com painéis pré-configurados

### 6.5 Escalabilidade
- [RNF-025] Stateless workers: escalar horizontalmente
- [RNF-026] DB connection pooling (max 20 connections/worker)
- [RNF-027] Suportar 100 empresas (MVP), 1000+ (produção)
- [RNF-028] Particionar fila por empresa (evitar head-of-line blocking)


## 7. Modelos de Dados (ER Atualizado)

### 7.1 Company
```sql
id: SERIAL PRIMARY KEY
name: VARCHAR(255) NOT NULL
slug: VARCHAR(100) UNIQUE NOT NULL
settings: JSONB DEFAULT '{}'  -- configurações customizadas
is_active: BOOLEAN DEFAULT TRUE
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()
```

### 7.2 GoogleProfile
```sql
id: SERIAL PRIMARY KEY
company_id: INTEGER REFERENCES Company(id) ON DELETE CASCADE
profile_name: VARCHAR(255) NOT NULL
google_account_id: VARCHAR(255) NOT NULL
google_location_id: VARCHAR(255) NOT NULL
oauth_refresh_token_encrypted: BYTEA NOT NULL  -- Fernet encrypted
oauth_access_token_encrypted: BYTEA
token_expiry: TIMESTAMP
is_active: BOOLEAN DEFAULT TRUE
last_sync_at: TIMESTAMP
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()

UNIQUE(google_account_id, google_location_id)
INDEX(company_id)
```

### 7.3 Template
```sql
id: SERIAL PRIMARY KEY
company_id: INTEGER REFERENCES Company(id) ON DELETE CASCADE
name: VARCHAR(255) NOT NULL
body: TEXT NOT NULL  -- com placeholders {{}}
tone: VARCHAR(50) NOT NULL  -- positivo, neutro, empatico, recuperacao
min_rating: SMALLINT DEFAULT 1 CHECK (min_rating BETWEEN 1 AND 5)
max_rating: SMALLINT DEFAULT 5 CHECK (max_rating BETWEEN 1 AND 5)
priority: INTEGER DEFAULT 0  -- maior = mais prioritário
keywords_required: JSONB DEFAULT '[]'  -- ["demora", "atraso"]
keywords_excluded: JSONB DEFAULT '[]'  -- ["excelente", "perfeito"]
cooldown_hours: INTEGER DEFAULT 24  -- tempo entre reuso
language: VARCHAR(10) DEFAULT 'pt-BR'
is_active: BOOLEAN DEFAULT TRUE
usage_count: INTEGER DEFAULT 0
last_used_at: TIMESTAMP
created_by: INTEGER  -- user_id (futuro)
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()

INDEX(company_id, is_active)
INDEX(min_rating, max_rating)
CHECK(max_rating >= min_rating)
```

### 7.4 Evaluation
```sql
id: SERIAL PRIMARY KEY
google_review_id: VARCHAR(255) UNIQUE NOT NULL
profile_id: INTEGER REFERENCES GoogleProfile(id) ON DELETE CASCADE
author_name: VARCHAR(255)
rating: SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5)
text: TEXT
language_detected: VARCHAR(10)  -- pt-BR, en-US
sentiment_score: FLOAT  -- -1.0 a 1.0 (VADER/TextBlob)
priority: VARCHAR(20) NOT NULL  -- URGENT, HIGH, NORMAL, LOW
requires_human_review: BOOLEAN DEFAULT FALSE
review_created_at: TIMESTAMP NOT NULL  -- data da avaliação no Google
processed_at: TIMESTAMP
status: VARCHAR(20) DEFAULT 'pending'  -- pending, processing, completed, failed
error_message: TEXT
retry_count: INTEGER DEFAULT 0
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()

INDEX(profile_id, status)
INDEX(priority, created_at)
INDEX(google_review_id)
```

### 7.5 GeneratedResponse
```sql
id: SERIAL PRIMARY KEY
evaluation_id: INTEGER REFERENCES Evaluation(id) ON DELETE CASCADE
template_id: INTEGER REFERENCES Template(id) ON DELETE SET NULL
response_text: TEXT NOT NULL
model_used: VARCHAR(50) DEFAULT 'gemini-1.0'
confidence_score: FLOAT  -- 0.0 a 1.0
moderation_flags: JSONB DEFAULT '[]'  -- ["tone_mismatch", "low_confidence"]
moderation_status: VARCHAR(20) DEFAULT 'pending'  -- pending, approved, blocked, rejected
status: VARCHAR(20) DEFAULT 'draft'  -- draft, sent, failed
published_at: TIMESTAMP
user_feedback: VARCHAR(20)  -- good, bad, edited (input manual)
edited_version: TEXT  -- se admin editou
engagement_score: FLOAT  -- métrica futura
retry_count: INTEGER DEFAULT 0
error_message: TEXT
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()

INDEX(evaluation_id)
INDEX(status, created_at)
INDEX(moderation_status)
```

### 7.6 TemplateCooldown
```sql
id: SERIAL PRIMARY KEY
profile_id: INTEGER REFERENCES GoogleProfile(id) ON DELETE CASCADE
template_id: INTEGER REFERENCES Template(id) ON DELETE CASCADE
last_used_at: TIMESTAMP NOT NULL
expires_at: TIMESTAMP NOT NULL  -- last_used_at + cooldown_hours

UNIQUE(profile_id, template_id)
INDEX(profile_id, expires_at)
```

### 7.7 AuditLog
```sql
id: SERIAL PRIMARY KEY
entity: VARCHAR(50) NOT NULL  -- Template, GeneratedResponse, etc
entity_id: INTEGER NOT NULL
action: VARCHAR(50) NOT NULL  -- created, updated, deleted, approved
payload: JSONB  -- dados relevantes
user_id: INTEGER  -- (futuro: sistema de usuários)
ip_address: INET
user_agent: TEXT
created_at: TIMESTAMP DEFAULT NOW()

INDEX(entity, entity_id)
INDEX(created_at)
```

### 7.8 SystemMetrics (opcional - para analytics)
```sql
id: SERIAL PRIMARY KEY
metric_name: VARCHAR(100) NOT NULL
metric_value: FLOAT NOT NULL
dimensions: JSONB  -- {"company_id": 1, "profile_id": 5}
timestamp: TIMESTAMP DEFAULT NOW()

INDEX(metric_name, timestamp)
```


## 8. Regras de Seleção de Template (Detalhado)

### 8.1 Algoritmo
```python
def select_template(evaluation, templates):
    # 1. Filtrar por rating range
    candidates = [t for t in templates 
                  if t.min_rating <= evaluation.rating <= t.max_rating
                  and t.is_active
                  and t.language == evaluation.language_detected]
    
    # 2. Filtrar por keywords_required (todas devem estar presentes)
    candidates = [t for t in candidates
                  if all(kw.lower() in evaluation.text.lower() 
                         for kw in t.keywords_required)]
    
    # 3. Excluir por keywords_excluded (nenhuma deve estar presente)
    candidates = [t for t in candidates
                  if not any(kw.lower() in evaluation.text.lower() 
                            for kw in t.keywords_excluded)]
    
    # 4. Verificar cooldown
    candidates = [t for t in candidates
                  if not is_in_cooldown(t, evaluation.profile_id)]
    
    # 5. Ordenar por priority (maior primeiro)
    candidates.sort(key=lambda t: t.priority, reverse=True)
    
    # 6. Retornar primeiro match ou fallback genérico
    return candidates[0] if candidates else get_fallback_template()
```

### 8.2 Classificação de Prioridade
```python
def calculate_priority(evaluation):
    priority = "NORMAL"
    
    # Keywords críticas
    critical_keywords = ["fraude", "roubo", "polícia", "processo", 
                        "nunca mais", "horrível", "péssimo"]
    
    if evaluation.rating <= 2:
        if any(kw in evaluation.text.lower() for kw in critical_keywords):
            priority = "URGENT"
        else:
            priority = "HIGH"
    elif evaluation.rating == 3:
        priority = "NORMAL"
    else:  # 4-5 estrelas
        priority = "LOW"
    
    return priority
```

### 8.3 Extração de Placeholders
```python
def extract_placeholders(evaluation):
    # Extração básica via regex/keywords
    issue_keywords = ["demora", "atraso", "espera", "atendimento", "sujo"]
    positive_keywords = ["ótimo", "excelente", "maravilhoso", "perfeito"]
    
    issue = next((kw for kw in issue_keywords 
                  if kw in evaluation.text.lower()), None)
    
    positive = next((kw for kw in positive_keywords 
                     if kw in evaluation.text.lower()), None)
    
    return {
        "author_name": evaluation.author_name or "cliente",
        "company_name": evaluation.profile.company.name,
        "rating": evaluation.rating,
        "issue": issue or "inconveniente",
        "positive_point": positive or "feedback"
    }
```


## 9. Endpoints da API (Resumo)

### Autenticação
- `GET /connect/google?company_id={id}` - Iniciar OAuth2
- `GET /oauth2/callback` - Callback OAuth2

### Templates
- `POST /api/templates` - Criar template
- `GET /api/templates` - Listar templates
- `GET /api/templates/{id}` - Detalhes de template
- `PUT /api/templates/{id}` - Atualizar template
- `DELETE /api/templates/{id}` - Deletar template (soft delete)
- `POST /api/templates/{id}/test` - Testar template com dados mock

### Avaliações
- `GET /api/reviews` - Listar avaliações (paginado)
- `GET /api/reviews/{id}` - Detalhes de avaliação
- `POST /api/reviews/sync` - Forçar sincronização manual

### Respostas
- `GET /api/responses` - Listar respostas geradas
- `GET /api/responses/{id}` - Detalhes de resposta
- `POST /api/responses/{id}/approve` - Aprovar resposta bloqueada
- `POST /api/responses/{id}/reject` - Rejeitar e regerar
- `PUT /api/responses/{id}/edit` - Editar antes de publicar
- `POST /api/responses/{id}/retry` - Tentar reenviar resposta falhada

### Processamento
- `POST /api/process_queue` - Trigger manual (cron usa este)
- `GET /api/queue/status` - Status da fila

### Analytics
- `GET /api/analytics/dashboard` - Métricas principais
- `GET /api/analytics/templates` - Performance de templates
- `GET /api/analytics/trends` - Tendências (ratings por tempo)

### Moderação
- `GET /api/moderation/pending` - Itens aguardando revisão humana
- `POST /api/moderation/bulk-approve` - Aprovar múltiplos

### Auditoria
- `GET /api/audit/logs` - Consultar audit logs

### Webhooks (opcional)
- `POST /api/webhook/review` - Receber notificação de nova avaliação


## 10. Worker e Processamento Assíncrono

### 10.1 Celery Tasks
```python
# tasks.py
@celery.task(bind=True, max_retries=3)
def poll_reviews(self, profile_id):
    """Buscar novas avaliações de um perfil"""
    try:
        # fetch reviews from Google API
        # save new ones to DB
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery.task(bind=True, max_retries=3)
def process_evaluation(self, evaluation_id):
    """Processar uma avaliação: selecionar template + gerar resposta + moderar + publicar"""
    evaluation = Evaluation.query.get(evaluation_id)
    
    # 1. Selecionar template
    template = select_template(evaluation)
    
    # 2. Gerar resposta com Gemini
    response_text = generate_reply(template, evaluation)
    
    # 3. Moderar
    moderation_result = moderate_response(response_text, evaluation)
    
    # 4. Salvar GeneratedResponse
    response = GeneratedResponse(
        evaluation_id=evaluation_id,
        template_id=template.id,
        response_text=response_text,
        moderation_flags=moderation_result['flags'],
        moderation_status='approved' if moderation_result['approved'] else 'blocked'
    )
    db.session.add(response)
    db.session.commit()
    
    # 5. Se aprovado, publicar
    if moderation_result['approved']:
        publish_response.delay(response.id)
    
    return response.id

@celery.task(bind=True, max_retries=3)
def publish_response(self, response_id):
    """Publicar resposta no Google Business Profile"""
    response = GeneratedResponse.query.get(response_id)
    
    try:
        # POST to Google API
        google_api.post_reply(response.evaluation, response.response_text)
        
        response.status = 'sent'
        response.published_at = datetime.utcnow()
        db.session.commit()
        
    except Exception as exc:
        response.retry_count += 1
        response.error_message = str(exc)
        db.session.commit()
        
        if response.retry_count < 3:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            response.status = 'failed'
            db.session.commit()
            alert_admin(f"Failed to publish response {response_id} after 3 retries")
```

### 10.2 Celery Beat Schedule
```python
# celeryconfig.py
beat_schedule = {
    'poll-all-profiles-every-5-minutes': {
        'task': 'tasks.poll_all_profiles',
        'schedule': crontab(minute='*/5'),
    },
    'cleanup-old-logs-daily': {
        'task': 'tasks.cleanup_old_audit_logs',
        'schedule': crontab(hour=3, minute=0),  # 3 AM
    },
    'send-daily-report': {
        'task': 'tasks.send_daily_analytics_report',
        'schedule': crontab(hour=9, minute=0),  # 9 AM
    },
}
```


## 11. Sistema de Moderação (Detalhado)

```python
# moderation.py
class ModerationEngine:
    FORBIDDEN_WORDS = [
        'idiota', 'burro', 'incompetente', 'péssimo atendimento seu',
        # adicionar mais conforme necessário
    ]
    
    TONE_KEYWORDS = {
        'positive': ['parabéns', 'ótimo', 'excelente', 'adorei'],
        'negative': ['lamento', 'desculpe', 'sentimos', 'problema'],
    }
    
    def moderate(self, response_text: str, evaluation: Evaluation) -> dict:
        flags = []
        
        # 1. Forbidden words
        if any(word in response_text.lower() for word in self.FORBIDDEN_WORDS):
            flags.append('inappropriate_language')
        
        # 2. Tone mismatch
        rating = evaluation.rating
        text_lower = response_text.lower()
        
        if rating <= 2:  # review negativa
            if any(kw in text_lower for kw in self.TONE_KEYWORDS['positive']):
                flags.append('tone_mismatch')
        
        if rating >= 4:  # review positiva
            if any(kw in text_lower for kw in self.TONE_KEYWORDS['negative']):
                flags.append('tone_mismatch')
        
        # 3. Length
        if len(response_text) > 4096:
            flags.append('too_long')
        
        if len(response_text) < 10:
            flags.append('too_short')
        
        # 4. Sensitive data (regex básico)
        if re.search(r'\b\d{10,11}\b', response_text):  # telefone
            flags.append('sensitive_data')
        
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', response_text):
            flags.append('sensitive_data')
        
        # 5. Determinar ação
        critical_flags = {'inappropriate_language', 'sensitive_data'}
        warning_flags = {'tone_mismatch'}
        
        if any(f in flags for f in critical_flags):
            action = 'BLOCK'
            approved = False
        elif any(f in flags for f in warning_flags):
            action = 'WARN'
            approved = True  # publica mas alerta
        else:
            action = 'PASS'
            approved = True
        
        return {
            'approved': approved,
            'action': action,
            'flags': flags,
            'requires_human_review': action == 'BLOCK'
        }
```


## 12. Configurações do Sistema (ENV)

```bash
# Flask
FLASK_ENV=production
FLASK_APP=app.py
FLASK_SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql://user:pass@host:5432/ai_vibe_code
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# Redis (Cache + Celery)
REDIS_URL=redis://localhost:6379/0
CACHE_TTL_SECONDS=3600

# Google OAuth2
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=https://yourdomain.com/oauth2/callback

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=256
GEMINI_TIMEOUT_SECONDS=10

# Security
FERNET_KEY=base64-encoded-fernet-key
JWT_SECRET=your-jwt-secret
TOKEN_EXPIRY_HOURS=24

# Rate Limiting
RATE_LIMIT_PER_HOUR=50
MAX_QUEUE_SIZE=1000

# Processing
MAX_RETRIES=3
RETRY_BACKOFF_SECONDS=60
POLLING_INTERVAL_SECONDS=300
MAX_WORKERS=4

# Moderation
MODERATION_ENABLED=true
HUMAN_REVIEW_THRESHOLD=0.7
COOLDOWN_SAME_TEMPLATE_HOURS=24

# Alerts
SENTRY_DSN=https://...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_EMAIL=admin@company.com

# Observability
LOG_LEVEL=INFO
ENABLE_METRICS=true
METRICS_PORT=9090

# Google Business
GOOGLE_ACCOUNT_ID=your-account-id
GOOGLE_LOCATION_ID=your-location-id
```


## 13. Fluxo Completo (Step-by-Step)

### 13.1 Inicialização
1. Admin acessa `/connect/google?company_id=1`
2. Sistema redireciona para Google OAuth consent screen
3. Admin autoriza acesso ao Business Profile
4. Google redireciona para `/oauth2/callback?code=...`
5. Sistema troca code por tokens, salva refresh_token criptografado
6. GoogleProfile criado/atualizado no DB

### 13.2 Detecção de Avaliação
1. **Celery Beat** dispara task `poll_all_profiles` a cada 5 minutos
2. Para cada GoogleProfile ativo:
   - Busca reviews da Google Business Profile API
   - Filtra apenas reviews novos (google_review_id não existe no DB)
   - Para cada novo review:
     - Analisa sentimento com TextBlob/VADER
     - Detecta idioma
     - Calcula prioridade (URGENT/HIGH/NORMAL/LOW)
     - Cria `Evaluation` com status='pending'
     - Dispara task `process_evaluation.delay(evaluation_id)`

### 13.3 Processamento
1. **Task process_evaluation** recebe evaluation_id
2. Busca Evaluation no DB
3. **Seleção de Template**:
   - Filtra templates por rating range
   - Filtra por keywords_required (AND)
   - Exclui por keywords_excluded (OR)
   - Verifica cooldown (consulta TemplateCooldown)
   - Ordena por priority
   - Retorna primeiro match ou fallback
4. **Extração de Placeholders**:
   - author_name, company_name, rating (direto do DB)
   - issue, positive_point (extração via keywords)
5. **Geração com Gemini**:
   - Monta prompt estruturado
   - Substitui placeholders no template
   - Chama Gemini API com retry (3x)
   - Se falhar, usa template puro (fallback)
6. **Moderação**:
   - Valida forbidden words
   - Verifica tone mismatch
   - Checa tamanho (10-4096 chars)
   - Detecta dados sensíveis
   - Gera flags e action (BLOCK/WARN/PASS)
7. **Salva GeneratedResponse**:
   - response_text, template_id, confidence_score
   - moderation_flags, moderation_status
   - Se BLOCK → requires_human_review=true
8. **Publicação**:
   - Se approved → dispara task `publish_response.delay(response_id)`
   - Se bloqueado → envia alerta para admin

### 13.4 Publicação
1. **Task publish_response** recebe response_id
2. Busca GeneratedResponse + Evaluation relacionada
3. Obtém credentials do GoogleProfile (refresh se expirado)
4. POST para Google API: `accounts/{id}/locations/{id}/reviews/{id}/reply`
5. **Sucesso**:
   - Atualiza status='sent', published_at=now()
   - Atualiza Template.usage_count++, last_used_at
   - Cria TemplateCooldown entry
   - Log de sucesso
6. **Falha**:
   - Incrementa retry_count
   - Salva error_message
   - Se retry_count < 3 → retry com backoff exponencial
   - Se retry_count >= 3 → status='failed', alerta admin

### 13.5 Revisão Humana (para bloqueados)
1. Admin acessa `/api/moderation/pending`
2. Visualiza resposta bloqueada com flags
3. **Opções**:
   - **Aprovar**: POST `/api/responses/{id}/approve` → dispara publicação
   - **Editar**: PUT `/api/responses/{id}/edit` → salva edited_version → publica versão editada
   - **Rejeitar**: POST `/api/responses/{id}/reject` → marca como rejected, dispara regeneração com outro template


## 14. Casos de Uso Detalhados

### UC-001: Responder Avaliação 5 Estrelas
**Ator**: Sistema (automático)
**Pré-condição**: Nova avaliação 5★ detectada
**Fluxo**:
1. Worker detecta review: "Adorei o atendimento! Maria foi super atenciosa."
2. Sistema calcula: priority=LOW, sentiment=0.85 (positivo)
3. Seleciona template: "Agradecimento 5 estrelas"
   - body: "Olá {{author_name}}! Que alegria ler seu feedback! {{positive_point}} é o que nos motiva. Volte sempre! 🌟"
4. Extrai placeholders: author_name="João", positive_point="sua satisfação"
5. Gemini gera: "Olá João! Que alegria ler seu feedback! Sua satisfação é o que nos motiva. A Maria ficará muito feliz em saber! Volte sempre! 🌟"
6. Moderação: PASS (sem flags)
7. Publica no Google
8. Cliente recebe resposta em < 5 minutos

### UC-002: Recuperar Avaliação 1 Estrela
**Ator**: Sistema + Admin (moderação)
**Pré-condição**: Avaliação 1★ com palavra crítica
**Fluxo**:
1. Review: "Péssimo! Esperei 2 horas, comida fria. Nunca mais volto!"
2. Sistema calcula: priority=URGENT, sentiment=-0.92
3. Seleciona template: "Recuperação urgente"
   - body: "{{author_name}}, lamentamos profundamente. {{issue}} não reflete nosso padrão. Entre em contato: {{phone}}"
4. Gemini gera resposta
5. Moderação detecta: tone_mismatch (falso positivo) → action=WARN
6. Sistema publica mas alerta admin
7. Admin revisa, aprova
8. Gerente entra em contato diretamente com cliente

### UC-003: Bloquear Resposta Inadequada
**Ator**: Sistema (moderação automática)
**Pré-condição**: Gemini gera resposta com problema
**Fluxo**:
1. Review 2★: "Atendimento horrível"
2. Gemini (bug hipotético): "Que bom que gostou! Volte sempre!"
3. Moderação detecta: tone_mismatch (positivo em review negativa)
4. action=BLOCK → não publica
5. Admin recebe alerta no Slack
6. Admin acessa painel, vê resposta bloqueada
7. Edita para: "Lamentamos sua experiência. Podemos melhorar?"
8. Aprova manualmente → publicado

### UC-004: A/B Testing de Templates (Fase 2)
**Ator**: Admin
**Pré-condição**: 2 templates ativos para 4-5★
**Fluxo**:
1. Admin cria Template A (formal) e B (casual)
2. Sistema alterna aleatoriamente (50/50)
3. Após 100 usos cada:
   - Template A: 12 edições manuais, 3 feedbacks negativos
   - Template B: 4 edições manuais, 0 feedbacks negativos
4. Dashboard mostra Template B é superior
5. Admin desativa Template A


## 15. Métricas e KPIs

### 15.1 Métricas de Negócio
- **Taxa de Resposta**: % de reviews respondidas (meta: >95%)
- **Tempo Médio de Resposta**: minutos entre review e resposta (meta: <10 min)
- **Taxa de Recuperação**: % de 1-2★ que geraram contato/resolução
- **Engajamento**: % de clientes que respondem à resposta

### 15.2 Métricas Técnicas
- **Uptime**: % de disponibilidade (meta: 99.5%)
- **Latência Gemini**: p50, p95, p99 (meta p95: <5s)
- **Taxa de Erro**: % de falhas (meta: <2%)
- **Fila Média**: número de items pendentes (meta: <20)
- **Taxa de Moderação**: % bloqueadas (esperado: 1-3%)

### 15.3 Métricas de Qualidade
- **Edições Manuais**: % de respostas editadas por admin (meta: <10%)
- **Rejeições**: % de respostas rejeitadas (meta: <5%)
- **Feedback Positivo**: % marcadas como "good" (meta: >80%)
- **Variabilidade**: % de templates com cooldown respeitado (meta: 100%)


## 16. Roadmap de Desenvolvimento

### Fase 1: MVP (4-6 semanas)
**Objetivos**: Sistema funcional end-to-end
- [x] Setup inicial: Flask, PostgreSQL, Celery, Redis
- [ ] Modelos de dados + migrations
- [ ] OAuth2 Google Business Profile
- [ ] Polling de reviews (Celery task)
- [ ] Seleção de template (regras básicas)
- [ ] Integração Gemini (geração)
- [ ] Sistema de moderação (forbid words + size)
- [ ] Publicação no Google
- [ ] CRUD de templates (admin)
- [ ] Dashboard básico (últimas 100 respostas)
- [ ] Logs estruturados
- [ ] Deploy inicial (Railway/Render)

**Entregáveis**:
- Sistema responde automaticamente 4-5★
- Moderação bloqueia 1-2★ para revisão humana
- Admin consegue aprovar/editar/rejeitar
- 1 empresa, 1 perfil Google

### Fase 2: Robustez (4-6 semanas)
**Objetivos**: Produção-ready, multi-empresa
- [ ] Suporte multi-empresa/multi-perfil
- [ ] Sistema de usuários (admin, moderator, viewer)
- [ ] Análise de sentimento (TextBlob/VADER)
- [ ] Priorização inteligente (URGENT/HIGH/NORMAL/LOW)
- [ ] Keywords required/excluded
- [ ] Cooldown de templates
- [ ] Cache Redis para templates
- [ ] Circuit breaker + retry robusto
- [ ] Dead Letter Queue
- [ ] Integração Sentry
- [ ] Alertas Slack/Email
- [ ] Analytics dashboard (métricas principais)
- [ ] Testes unitários + integração (80% coverage)
- [ ] CI/CD pipeline

**Entregáveis**:
- Sistema 100% automático para 4-5★
- 1-2★ com moderação + fallback
- Suporte a 10 empresas simultâneas
- Uptime 99%+

### Fase 3: Otimização (6-8 semanas)
**Objetivos**: Escala e aprendizado
- [ ] A/B testing de templates
- [ ] Sistema de feedback (good/bad/edited)
- [ ] Relatórios semanais automatizados
- [ ] Detecção de idioma + templates multilíngue
- [ ] Extração avançada de placeholders (NLP)
- [ ] Webhook Google (substituir polling)
- [ ] Previsão de sentimento (ML model customizado)
- [ ] Dashboard Grafana com métricas avançadas
- [ ] Testes de carga (100 req/min)
- [ ] Documentação completa (usuário + dev)
- [ ] API pública (para integrações)

**Entregáveis**:
- Sistema aprende com feedback
- Suporta 100+ empresas
- 99.9% uptime
- Sub-5 minutos tempo de resposta médio

### Fase 4: Inovação (futuro)
- [ ] Chatbot para responder follow-ups
- [ ] Integração com CRM (Salesforce, HubSpot)
- [ ] Análise de competidores (reviews de outros)
- [ ] Recomendações automáticas de melhorias
- [ ] Mobile app para moderação
- [ ] Vídeo-respostas geradas por IA (avatar)


## 17. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Google muda API | Média | Alto | Monitorar changelog, versionar endpoints, testes E2E |
| Gemini quota excedida | Alta | Alto | Cache agressivo, fallback templates puros, escalonar quota |
| Resposta inapropriada passa moderação | Baixa | Crítico | Múltiplas camadas (regex + flags), revisão humana 1-2★ |
| Latência Gemini > 30s | Média | Médio | Timeout 10s, retry, fallback, alertas |
| Perda de dados (DB crash) | Baixa | Alto | Backup diário, réplicas, transaction logs |
| Token OAuth revogado | Média | Alto | Detecção automática, alerta admin, re-autenticação fácil |
| Fila travada (worker down) | Média | Médio | Health checks, auto-restart, alerta se sem processamento >1h |
| Sobrecarga (viral review) | Baixa | Médio | Rate limiting, auto-scaling workers, priorização |


## 18. Requisitos de Infraestrutura

### Ambiente de Desenvolvimento
- 1 VM/container: 2 vCPU, 4GB RAM
- PostgreSQL 14: 1GB RAM
- Redis: 512MB RAM

### Ambiente de Produção (MVP - até 10 empresas)
- **Web/API**: 2 instâncias (load balanced), 2 vCPU, 4GB RAM cada
- **Workers**: 2 instâncias Celery, 2 vCPU, 4GB RAM cada
- **PostgreSQL**: 2 vCPU, 8GB RAM, 100GB SSD (gerenciado)
- **Redis**: 1GB RAM (gerenciado)
- **Backup**: Daily snapshots, 30 dias retenção

### Produção Escalada (100+ empresas)
- **Web/API**: 5+ instâncias (auto-scaling), 4 vCPU, 8GB RAM
- **Workers**: 10+ instâncias (auto-scaling)
- **PostgreSQL**: 8 vCPU, 32GB RAM, 500GB SSD, read replicas
- **Redis Cluster**: 4GB RAM, 3 nodes
- **CDN**: CloudFlare para assets estáticos
- **Monitoring**: Prometheus + Grafana stack


## 19. Segurança - Checklist

- [ ] Tokens OAuth2 criptografados at rest (Fernet)
- [ ] Secrets em env vars ou Vault (nunca em código)
- [ ] TLS/HTTPS obrigatório (Let's Encrypt)
- [ ] Rate limiting (100 req/min por IP)
- [ ] SQL injection protegido (SQLAlchemy parameterized queries)
- [ ] XSS protegido (Flask auto-escape templates)
- [ ] CSRF tokens em formulários
- [ ] CORS configurado (whitelist domains)
- [ ] Logs sanitizados (sem tokens/senhas completos)
- [ ] Audit log de ações sensíveis
- [ ] Permissões RBAC (admin/moderator/viewer)
- [ ] 2FA para admins (opcional Fase 2)
- [ ] Penetration test antes de produção
- [ ] GDPR compliance (se aplicável):
  - [ ] Right to deletion
  - [ ] Data portability
  - [ ] Privacy policy


## 20. Documentação Entregável

### Para Desenvolvedores
1. **README.md**: setup rápido, arquitetura overview
2. **CONTRIBUTING.md**: guia de contribuição, padrões código
3. **ARCHITECTURE.md**: diagramas, decisões técnicas
4. **API_REFERENCE.md**: Swagger/OpenAPI spec completo
5. **DEPLOYMENT.md**: guia deploy Railway/AWS/GCP

### Para Usuários
1. **USER_GUIDE.md**: como conectar Google, criar templates
2. **FAQ.md**: troubleshooting comum
3. **VIDEO_TUTORIAL**: walkthrough 5 min (Loom)

### Para Admins
1. **RUNBOOK.md**: procedimentos operacionais
2. **MONITORING.md**: dashboards, alertas, como interpretar
3. **DISASTER_RECOVERY.md**: backup/restore, failover


## 21. Critérios de Aceite (MVP)

### Must-Have (bloqueante)
- ✅ Admin consegue conectar conta Google via OAuth2
- ✅ Sistema detecta novas reviews (polling 5 min)
- ✅ Sistema seleciona template baseado em rating
- ✅ Gemini gera resposta com placeholders substituídos
- ✅ Moderação bloqueia palavras proibidas
- ✅ Resposta é publicada no Google Business Profile
- ✅ Dashboard mostra últimas 50 respostas
- ✅ Admin consegue criar/editar/deletar templates
- ✅ Admin consegue aprovar respostas bloqueadas
- ✅ Logs estruturados em JSON
- ✅ Sistema funciona em produção (Railway/Render)
- ✅ Tempo resposta < 10 min (p95)
- ✅ Taxa erro < 5%

### Should-Have (importante)
- ✅ Análise de sentimento prévia
- ✅ Priorização de 1-2★
- ✅ Keywords required/excluded
- ✅ Retry automático (3x)
- ✅ Alertas Slack para erros críticos
- ✅ Métricas básicas (dashboard)

### Nice-to-Have (futuro)
- ⏳ A/B testing
- ⏳ Multi-idioma
- ⏳ Webhook Google (em vez de polling)
- ⏳ Mobile app


## 22. Glossário

- **Evaluation**: Registro de uma avaliação do Google no sistema
- **Template**: Modelo de resposta com placeholders
- **Placeholder**: Variável no template (ex: `{{author_name}}`)
- **Moderação**: Processo automático de validação antes de publicar
- **Cooldown**: Tempo mínimo entre usos do mesmo template
- **Priority**: Urgência de processamento (URGENT/HIGH/NORMAL/LOW)
- **Sentiment Score**: Valor -1.0 a 1.0 indicando polaridade
- **Circuit Breaker**: Padrão que pausa chamadas após falhas repetidas
- **Dead Letter Queue**: Fila para mensagens que falharam permanentemente
- **Fallback**: Ação alternativa quando primária falha


## 23. Contatos e Suporte

### Time de Desenvolvimento
- **Tech Lead**: [nome] - tech.lead@company.com
- **Backend**: [nome] - backend@company.com
- **DevOps**: [nome] - devops@company.com

### Stakeholders
- **Product Owner**: [nome] - po@company.com
- **CEO**: [nome] - ceo@company.com

### Canais
- **Slack**: #ai-vibe-code
- **Jira**: AI-VIBE board
- **Docs**: Notion / Confluence
- **Repo**: github.com/company/ai-vibe-code


---

**Versão**: 2.0  
**Última Atualização**: 2025-10-08  
**Autor**: Time AI Vibe Code  
**Status**: Aprovado para desenvolvimento MVP
