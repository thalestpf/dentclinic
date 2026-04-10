# N8N Infrastructure Report - DentClinic

**Data:** 2026-04-09  
**Instância:** https://n8n.geraresistemas.com.br  
**Status:** ✅ Conectado e Funcional

---

## 1. WORKFLOWS ATIVOS

### Summary
- **Total de Workflows:** 1
- **Workflows Ativos:** 1 ✅
- **Workflows Inativos:** 0

### Detalhes dos Workflows

| ID | Nome | Status | Criado | Nós |
|---|---|---|---|---|
| `MhNzb6eLK8gauMTJ` | Exemplo evo-go | ✅ ATIVO | 2026-04-09 05:16:18 | webhook |

**Nós utilizados:**
- `n8n-nodes-base.webhook` (v2.1) - Trigger HTTP POST

---

## 2. NÓS DISPONÍVEIS PARA DENTCLINIC

### Nós Essenciais Identificados

#### 2.1 WEBHOOK (Triggers)
```
nodeType: nodes-base.webhook
workflowNodeType: n8n-nodes-base.webhook
Versão: 2.1
Métodos HTTP suportados: GET, POST, PUT, PATCH, DELETE, HEAD
Uso: Triggers para receber dados da aplicação Next.js via HTTP
```

**Casos de uso para DentClinic:**
- ✅ Receber agendamentos do formulário de Agenda
- ✅ Receber dados de Pacientes cadastrados
- ✅ Receber confirmações de Orçamentos
- ✅ Webhook para confirmação de agendamento via WhatsApp

#### 2.2 HTTP REQUEST
```
nodeType: nodes-base.httpRequest
workflowNodeType: n8n-nodes-base.httpRequest
Uso: Fazer requisições HTTP para APIs externas
Suporta: GET, POST, PUT, PATCH, DELETE
Autenticação: Basic, Bearer, API Key
```

**Casos de uso para DentClinic:**
- ✅ Enviar dados para sistemas de faturamento
- ✅ Integração com Supabase (quando migrar de localStorage)
- ✅ Consultar APIs externas (ex: CEP para endereços)

#### 2.3 WHATSAPP
```
nodeType: nodes-base.whatsapp (via Twilio/Meta)
Uso: Enviar mensagens WhatsApp
Suporta: Mensagens de texto, mídia, templates
```

**Casos de uso para DentClinic:**
- ✅ Confirmação de agendamento por WhatsApp (já documentado em CLAUDE.md)
- ✅ Lembrete 24h antes da consulta
- ✅ Notificação de orçamento aprovado
- ✅ Disponibilidade de horários

**Credenciais necessárias:**
- Número de telefone WhatsApp Business
- Token de acesso (Meta/Twilio)
- Webhook URL para receber mensagens de entrada

#### 2.4 EMAIL
```
nodeType: nodes-base.emailSend (Gmail, Sendgrid, SMTP)
Uso: Enviar emails
Suporta: Templates HTML, attachments, CC/BCC
```

**Casos de uso para DentClinic:**
- ✅ Confirmação de agendamento por email
- ✅ Recepção de orçamento (PDF anexado)
- ✅ Notificações financeiras
- ✅ Recibos de procedimentos

#### 2.5 DATABASE / DATA TABLES
```
nodeType: nodes-base.dataTable
Uso: Gerenciar tabelas de dados no n8n
Operações: Create, Read, Update, Delete rows
```

**Casos de uso para DentClinic:**
- ✅ Sincronizar agendamentos com tabela n8n
- ✅ Armazenar histórico de mensagens WhatsApp
- ✅ Cache de pacientes para buscas rápidas

---

## 3. RECOMENDAÇÕES DE INTEGRAÇÃO

### Fluxo Proposto: Agendamento → WhatsApp → Email → Financeiro

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend DentClinic (Next.js 15)                                 │
│ - Formulário de Agendamento                                     │
│ - Dados: paciente, data, hora, procedimento                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ POST /webhook/{id}
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ N8N Workflow: "Novo Agendamento"                                │
│ Trigger: Webhook (POST)                                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Validar dados (required fields)                              │
│ 2. Salvar em Data Table (histórico)                             │
│ 3. Enviar confirmação WhatsApp                                  │
│ 4. Enviar email ao paciente                                     │
│ 5. Atualizar Supabase (dentistas, pacientes)                    │
│ 6. Chamar HTTP → sistema financeiro                             │
└────────────────┬─────────────────────────────────────────────────┘
                 │
        ┌────────┴────────────────────────┐
        │                                 │
        ▼                                 ▼
   WhatsApp                         Email
 ✅ Confirmado                  ✅ Comprovante
```

### Fluxo Proposto: Lembrete Automático (24h antes)

```
┌─────────────────────────────────────────────────────────────────┐
│ N8N Workflow: "Lembrete de Agendamento" (Scheduled)             │
│ Trigger: Cron (diariamente às 09:00)                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Buscar agendamentos para amanhã (Data Table)                │
│ 2. Para cada agendamento:                                       │
│    ├─ WhatsApp: "Olá {{paciente}}, lembramos...{{hora}}"       │
│    └─ Email: Confirmação da consulta                           │
│ 3. Marcar como "lembrete enviado"                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. CREDENCIAIS NECESSÁRIAS

Para implementar integrações em produção:

### WhatsApp (Meta/Twilio)
- [ ] Business Phone Number (com Meta Business Account)
- [ ] Permanent Access Token
- [ ] Webhook URL (n8n fornecerá)
- [ ] Validação Token (para receber mensagens)

### Email (Sendgrid ou Gmail)
- [ ] API Key (Sendgrid) OU Credenciais OAuth (Gmail)
- [ ] Email remetente verificado
- [ ] Template IDs (opcional, para templates pré-formatados)

### Supabase (quando migrar)
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY (client)
- [ ] SUPABASE_SERVICE_ROLE_KEY (server/n8n)

### Sistemas Externos (Financeiro, etc)
- [ ] API URLs
- [ ] API Keys / Bearer Tokens
- [ ] IPs whitelisted (se necessário)

---

## 5. PRÓXIMAS ETAPAS

### Phase 1: Webhook Básico (1-2 dias)
- [ ] Criar workflow "Novo Agendamento" (Webhook → Log)
- [ ] Testar endpoint do webhook
- [ ] Salvar dados em Data Table
- [ ] Conectar ao frontend (adicionar fetch em agenda/page.jsx)

### Phase 2: WhatsApp + Email (2-3 dias)
- [ ] Configurar credenciais WhatsApp
- [ ] Criar workflow "Enviar confirmação"
- [ ] Configurar credenciais Email
- [ ] Testar envio de mensagens

### Phase 3: Lembretes Automáticos (1 dia)
- [ ] Criar workflow "Lembrete 24h"
- [ ] Agendar com Cron trigger
- [ ] Testar execução

### Phase 4: Integração Financeira (2-3 dias)
- [ ] Mapear API do sistema financeiro
- [ ] Criar workflow "Sincronizar Faturamento"
- [ ] Implementar retry logic e error handling

---

## 6. EXEMPLO: WORKFLOW WEBHOOK PARA AGENDAMENTO

```javascript
// Fluxo no n8n:
// 1. Webhook Trigger (POST)
//    - Recebe: {paciente, data, hora, procedimento, dentista}
//
// 2. HTTP Request (Validação/Supabase)
//    - POST https://supabase.com/rest/v1/agendamentos
//    - Body: $json
//
// 3. WhatsApp Send Message
//    - Template: "Seu agendamento foi confirmado para {{data}} às {{hora}}"
//    - Número: $json.telefone
//
// 4. Email Send
//    - To: $json.email
//    - Subject: "Agendamento Confirmado"
//    - Body: HTML com detalhes do agendamento
//
// 5. Data Table - Insert Row
//    - Table: "agendamentos_log"
//    - Data: $json + timestamp + status
//
// 6. Respond (Webhook)
//    - Return: {success: true, agendamentoId: ...}
```

---

## 7. STATUS DA INTEGRAÇÃO

| Componente | Status | Observação |
|---|---|---|
| n8n Instance | ✅ Online | Acessível em https://n8n.geraresistemas.com.br |
| API n8n | ✅ Funcional | Autenticação via X-N8N-API-KEY |
| Webhook | ✅ Disponível | Pronto para receber dados do frontend |
| WhatsApp | 🔴 Não Configurado | Credenciais necessárias |
| Email | 🔴 Não Configurado | Credenciais necessárias |
| Data Tables | ✅ Disponível | Pronto para uso via API |
| Supabase | ⏳ Preparado | URLs configuradas, aguarda migração |

---

## 8. DOCUMENTAÇÃO DE REFERÊNCIA

- **n8n Webhook Docs:** https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- **n8n Expression Syntax:** https://docs.n8n.io/code-examples/expressions/
- **DentClinic CLAUDE.md:** `/h/Aplicativos/Dentclinic/dentclinic-next/CLAUDE.md`
- **DentClinic Super Admin Config:** `/app/(app)/super-admin/integracoes/page.jsx`

---

**Próximo Passo:** Configurar credenciais de WhatsApp e Email, depois começar com Phase 1 (Webhook Básico).
