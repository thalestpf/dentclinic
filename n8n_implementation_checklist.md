# N8N Implementation Checklist - DentClinic

**Status:** Em Planejamento  
**Responsável:** Time de Desenvolvimento  
**Data de Início:** 2026-04-09

---

## Phase 1: Webhook Básico (1-2 dias)

### Setup Inicial
- [ ] Acessar n8n em https://n8n.geraresistemas.com.br
- [ ] Criar novo workflow: "Agendamento - Webhook Básico"
- [ ] Adicionar nó Webhook (POST, path: `agendamento`)
- [ ] Testar webhook URL gerada

### Frontend Integration
- [ ] Criar hook `useN8nWebhook()` em `/components/hooks/useN8nWebhook.js`
- [ ] Atualizar `/app/(app)/agenda/page.jsx`
  - [ ] Importar hook
  - [ ] Chamar webhook ao criar/editar agendamento
  - [ ] Mostrar loading/erro ao usuário
- [ ] Testar envio de dados do formulário

### Data Logging
- [ ] Criar Data Table "agendamentos_log" no n8n
  - Colunas: id, paciente_nome, paciente_email, data, hora, status, timestamp
- [ ] Adicionar nó "Data Table - Insert Row" no workflow
- [ ] Testar se dados estão sendo salvos

### Testing
- [ ] Teste manual: Criar agendamento via interface
- [ ] Verificar se dados chegam em agendamentos_log
- [ ] Verificar resposta do webhook (sucesso/erro)
- [ ] Teste de erro: Enviar payload inválido
- [ ] Validação no n8n (required fields)

### Documentação
- [ ] Documentar webhook URL em README
- [ ] Adicionar exemplo de payload em CLAUDE.md
- [ ] Criar arquivo `/docs/n8n_webhook_api.md`

---

## Phase 2: WhatsApp Confirmation (2-3 dias)

### Configuração WhatsApp
- [ ] Criar conta Business no Meta
- [ ] Vincular WhatsApp Business Account
- [ ] Solicitar aprovação de template (agendamento_confirmado)
  ```
  Olá {{1}}, Seu agendamento foi confirmado para {{2}} às {{3}} com {{4}}.
  ```
- [ ] Obter credentials:
  - [ ] Phone Number ID
  - [ ] Business Account ID
  - [ ] Permanent Access Token

### N8N Setup
- [ ] Criar credencial "WhatsApp" no n8n
  - [ ] Colar Phone Number ID
  - [ ] Colar Business Account ID
  - [ ] Colar Access Token
  - [ ] Testar conexão
- [ ] Adicionar nó WhatsApp ao workflow "Agendamento - Webhook"
  - [ ] Configurar template: `agendamento_confirmado`
  - [ ] Mapear variáveis: {{1}}=nome, {{2}}=data, {{3}}=hora, {{4}}=dentista
- [ ] Adicionar nó "Data Table - Insert" para log de mensagens

### Testing
- [ ] Enviar agendamento e verificar WhatsApp
- [ ] Testar com número de teste
- [ ] Verificar formatação da mensagem
- [ ] Testar retry se mensagem falhar
- [ ] Logar todas as tentativas em data table

### Error Handling
- [ ] Adicionar tratamento de erro (número inválido)
- [ ] Log centralizado de falhas
- [ ] Opção de retry manual em admin dashboard

### Dashboard Admin
- [ ] Criar página `/app/(app)/super-admin/mensagens-whatsapp/page.jsx`
  - [ ] Tabela de mensagens enviadas
  - [ ] Filtros: data, status, tipo
  - [ ] Retry manual button

---

## Phase 3: Email Integration (2 dias)

### Configuração Email
- [ ] Configurar Sendgrid OR Gmail
  - **Sendgrid:**
    - [ ] Criar API Key
    - [ ] Verificar "From" email
  - **Gmail:**
    - [ ] Criar App Password
    - [ ] Ativar OAuth

### N8N Setup
- [ ] Criar credencial "Email" no n8n
- [ ] Criar arquivo `/email_templates/confirmacao_agendamento.html`
- [ ] Adicionar nó Email ao workflow
  - [ ] Subject: `Agendamento Confirmado - {{data}} às {{hora}}`
  - [ ] Template HTML com variáveis
  - [ ] From: agendamentos@clinica.com.br

### Templates
- [ ] **confirmacao_agendamento.html** - Novo agendamento
  - Incluir: data, hora, dentista, procedimento, telefone clínica
  - Botão "Confirmar presença" (webhook ou link dinâmico)
- [ ] **lembrete_24h.html** - Lembrete automático
  - Incluir: data, hora, dentista
  - Botão para confirmar/cancelar
- [ ] **orcamento_aguardando.html** - Novo orçamento
  - PDF anexado
  - Link para aprovar
- [ ] **orcamento_aprovado.html** - Orçamento aprovado
  - Instruções de pagamento
  - Detalhes do plano

### Testing
- [ ] Testar envio manual
- [ ] Verificar formatação em inbox
- [ ] Testar com vários provedores de email
- [ ] Verificar logs em data table

### Analytics
- [ ] Adicionar tracking de abertura (pixel único)
- [ ] Dashboard: Taxa de abertura por template
- [ ] Dashboard: Bounce rate

---

## Phase 4: Automated Reminders (1-2 dias)

### Scheduler Setup
- [ ] Criar workflow "Lembrete 24h Antes"
  - [ ] Trigger: Cron - Diariamente às 09:00
  - [ ] Buscar agendamentos para amanhã (Data Table query)
  - [ ] Para cada agendamento:
    - [ ] Verificar se lembrete já foi enviado
    - [ ] Enviar WhatsApp (template: lembrete_24h)
    - [ ] Enviar Email (template: lembrete_24h.html)
    - [ ] Marcar como "lembrete_enviado = true"

### Error Handling
- [ ] Retry automático se alguma mensagem falhar
- [ ] Log de todas as tentativas
- [ ] Alert se > 10% de falha

### Testing
- [ ] Teste com data de amanhã
- [ ] Verificar execução do scheduler
- [ ] Testar com lote grande (1000+ agendamentos)
- [ ] Monitorar performance e timeout

### Monitoring
- [ ] Dashboard: Execuções do workflow
- [ ] Dashboard: Taxa de sucesso/falha
- [ ] Dashboard: Tempo médio de execução
- [ ] Alertas: Falha crítica > 50%

---

## Phase 5: Financial System Integration (2-3 dias)

### API Mapping
- [ ] Mapear campos DentClinic ↔ Sistema Financeiro
  - [ ] agendamento.id ↔ financial_id
  - [ ] paciente ↔ customer
  - [ ] procedimento + valor ↔ invoice item
  - [ ] data ↔ service_date
- [ ] Documentar endpoints:
  - [ ] POST /invoices (criar fatura)
  - [ ] PUT /invoices/{id} (atualizar)
  - [ ] GET /invoices/{id} (consultar)

### N8N Setup
- [ ] Criar workflow "Sincronizar com Financeiro"
- [ ] Adicionar nó HTTP Request
  - [ ] URL: {{FINANCIAL_API_URL}}/invoices
  - [ ] Method: POST
  - [ ] Headers: Authorization Bearer token
  - [ ] Body: Mapeamento de campos

### Testing
- [ ] Teste com agendamento real
- [ ] Verificar se fatura foi criada no sistema financeiro
- [ ] Validar valores e datas
- [ ] Teste de erro: API indisponível (retry)
- [ ] Teste de erro: Campo obrigatório faltando

### Rollback Plan
- [ ] Manter história em Data Table
- [ ] Opção de "reverter para rascunho"
- [ ] Log de todas as sincroniazações

---

## Phase 6: Super Admin Dashboard (2-3 dias)

### Criar Módulo: Integrações
- [ ] Rota: `/app/(app)/super-admin/integracoes/page.jsx`
- [ ] Abas:
  - [ ] WhatsApp Configuration
  - [ ] Email Configuration
  - [ ] Financial System
  - [ ] Logs & Monitoring

### WhatsApp Tab
- [ ] Form: Configurar credenciais
  - [ ] Phone Number ID (input)
  - [ ] Business Account ID (input)
  - [ ] Access Token (password, masked)
  - [ ] Status indicator (🟢 ativo / 🔴 inativo)
  - [ ] Botão "Test Connection"
- [ ] Tabela: Últimas mensagens enviadas
  - [ ] Para, Data, Template, Status
  - [ ] Filtros: Data range, Status
  - [ ] Paginação

### Email Tab
- [ ] Form: Configurar provider
  - [ ] Provider: Sendgrid / Gmail (select)
  - [ ] API Key (password)
  - [ ] From Email (input)
  - [ ] Test send button
- [ ] Tabela: Templates
  - [ ] Nome, Última modificação, Ativo/Inativo
  - [ ] Editar / Preview buttons
- [ ] Tabela: Últimos emails enviados
  - [ ] Para, Subject, Status, Data

### Financial Tab
- [ ] Form: Configurar API
  - [ ] API URL (input)
  - [ ] API Key (password)
  - [ ] Webhook URL (readonly, copy button)
  - [ ] Test connection button
- [ ] Status: ✅ Conectado / ❌ Erro
- [ ] Tabela: Últimas sincronizações
  - [ ] Data, Total de fatura, Status

### Logs & Monitoring Tab
- [ ] Tabela: Execution logs
  - [ ] Workflow, Data/Hora, Status, Mensagem
  - [ ] Filtros: Workflow, Status, Data
  - [ ] Link para ver detalhes (payload, resposta)
- [ ] Gráfico: Taxa de sucesso (últimos 30 dias)
- [ ] Gráfico: Tempo médio de execução

### Testing
- [ ] Interface responsiva (mobile + desktop)
- [ ] Todos os formulários validados
- [ ] Credenciais mascaradas (senha nunca visível)
- [ ] Dark mode compatibility (se aplicável)

---

## Phase 7: Monitoring & Optimization (Ongoing)

### Metrics to Track
- [ ] Webhook success rate
- [ ] Average webhook response time
- [ ] WhatsApp delivery rate
- [ ] Email bounce rate
- [ ] Error frequency by workflow
- [ ] Data table query performance

### Alerting
- [ ] Webhook failures > 5% (email alert)
- [ ] WhatsApp failures > 10% (dashboard alert)
- [ ] Email bounce rate > 2% (review template)
- [ ] Workflow timeout > 30s (investigate)

### Performance Optimization
- [ ] Index frequently queried columns in Data Tables
- [ ] Batch processing for large workflows (1000+ items)
- [ ] Cache credentials (don't re-fetch every execution)
- [ ] Optimize images in email templates

### Documentation
- [ ] API documentation for webhooks
- [ ] Runbook for common errors
- [ ] Disaster recovery plan
- [ ] SLA: 99% uptime target

---

## Dependency Chart

```
Phase 1: Webhook Básico
    ↓
Phase 2: WhatsApp ──→ Phase 3: Email
    ↓                      ↓
Phase 4: Reminders Automáticos
    ↓
Phase 5: Financial System
    ↓
Phase 6: Admin Dashboard
    ↓
Phase 7: Monitoring & Optimization (contínuo)
```

---

## Time Estimates

| Phase | Duração | Complexidade | Risco |
|---|---|---|---|
| 1. Webhook | 1-2 dias | Baixa | Baixo |
| 2. WhatsApp | 2-3 dias | Média | Médio (credenciais) |
| 3. Email | 2 dias | Baixa | Baixo |
| 4. Reminders | 1-2 dias | Média | Médio (timing) |
| 5. Financial | 2-3 dias | Alta | Alto (integração) |
| 6. Dashboard | 2-3 dias | Média | Baixo |
| 7. Monitoring | Contínuo | Média | Baixo |
| **Total** | **12-18 dias** | **Média** | **Médio** |

---

## Sign-Off Checklist

### Phase 1 Approval
- [ ] Webhook funcionando end-to-end
- [ ] Dados sendo salvos em Data Table
- [ ] Frontend enviando corretamente
- [ ] Code review passed
- [ ] Deployed to staging

### Phase 2 Approval
- [ ] WhatsApp credentials configuradas
- [ ] Template aprovado por Meta
- [ ] Mensagens enviadas com sucesso
- [ ] Logging implementado
- [ ] Deployed to staging

### Phase 3 Approval
- [ ] Email templates aprovados
- [ ] Envios funcionando
- [ ] Sem bounce errors
- [ ] Deployed to staging

### Phase 4 Approval
- [ ] Scheduler testado
- [ ] Lembrete enviado 24h antes
- [ ] Sem falsos positivos
- [ ] Performance OK (< 1 min por 1000 agendamentos)

### Phase 5 Approval
- [ ] Finanteiro sincronizando
- [ ] Valores corretos
- [ ] Rollback plan testado
- [ ] Audit trail completo

### Phase 6 Approval
- [ ] Dashboard responsivo
- [ ] Todos os KPIs visíveis
- [ ] Permissões por role OK
- [ ] Performance OK

### Production Readiness
- [ ] Todos os phases completados
- [ ] Testes de carga: 1000+ eventos/hora
- [ ] Disaster recovery testado
- [ ] SLA de 99% uptime confirmado
- [ ] Runbook finalizado

---

## Links Úteis

- N8N Instance: https://n8n.geraresistemas.com.br
- DentClinic Repo: /h/Aplicativos/Dentclinic/dentclinic-next
- Infrastructure Report: `n8n_infrastructure_report.md`
- Configuration Guide: `n8n_configuration_guide.md`
- CLAUDE.md: `/CLAUDE.md`

---

**Last Updated:** 2026-04-09  
**Next Review:** 2026-04-16
