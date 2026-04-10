# N8N Configuration Guide - DentClinic

**Versão:** 1.0  
**Atualizado:** 2026-04-09  
**Autor:** Claude Code

---

## Índice
1. [Nós Disponíveis](#1-nós-disponíveis)
2. [Configuração de Webhook](#2-configuração-de-webhook)
3. [Integração WhatsApp](#3-integração-whatsapp)
4. [Integração Email](#4-integração-email)
5. [Data Tables](#5-data-tables)
6. [Code Nodes](#6-code-nodes)
7. [Tratamento de Erros](#7-tratamento-de-erros)

---

## 1. Nós Disponíveis

### 1.1 WEBHOOK (Trigger Principal)

**Tipo:** `nodes-base.webhook` (workflow: `n8n-nodes-base.webhook`)

**Configuração Básica:**
```javascript
{
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2.1,
  "position": [-672, -224],
  "name": "Webhook",
  "parameters": {
    "httpMethod": "POST",
    "path": "agendamento",  // URL: /webhook/agendamento
    "options": {
      "responseMode": "onReceived",
      "responseData": "allEntries"
    }
  }
}
```

**Variáveis Disponíveis:**
- `$json` - Corpo completo da requisição
- `$request.headers` - Headers HTTP
- `$request.query` - Query parameters

**Exemplos de Payload:**

```json
// Novo Agendamento
POST /webhook/agendamento
{
  "pacienteId": "123",
  "pacienteNome": "João Silva",
  "pacienteTelefone": "+55 11 99999-9999",
  "pacienteEmail": "joao@email.com",
  "data": "2026-04-15",
  "hora": "14:30",
  "procedimento": "Limpeza",
  "procedimentoId": "proc_001",
  "dentistaId": "dentista_001",
  "dentistanome": "Dr. Carlos",
  "observacoes": "Paciente com sensibilidade"
}
```

**Resposta Automática:**
```json
{
  "success": true,
  "message": "Webhook recebido com sucesso",
  "timestamp": "2026-04-09T10:30:00Z"
}
```

---

### 1.2 HTTP REQUEST (Requisições Externas)

**Tipo:** `nodes-base.httpRequest`

**Configuração para Supabase:**
```javascript
{
  "type": "n8n-nodes-base.httpRequest",
  "name": "Supabase Insert",
  "parameters": {
    "url": "=`https://{{$env.NEXT_PUBLIC_SUPABASE_URL}}/rest/v1/agendamentos`",
    "method": "POST",
    "headers": {
      "apikey": "={{$env.NEXT_PUBLIC_SUPABASE_ANON_KEY}}",
      "Authorization": "=`Bearer {{$env.NEXT_PUBLIC_SUPABASE_ANON_KEY}}`",
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    "bodyParametersUi": "json",
    "body": "={{JSON.stringify($json)}}"
  }
}
```

**Configuração para API Externa:**
```javascript
{
  "type": "n8n-nodes-base.httpRequest",
  "name": "Financial System",
  "parameters": {
    "url": "=`{{$env.FINANCIAL_API_URL}}/agendamentos`",
    "method": "POST",
    "authentication": "genericCredentialType",
    "genericAuthType": "bearerToken",
    "options": {
      "timeout": 30000,
      "retryCount": 3,
      "retryOnStatusCodes": [408, 429, 500, 502, 503, 504]
    }
  }
}
```

---

### 1.3 WHATSAPP

**Tipo:** `nodes-base.whatsapp`

**Configuração:**
```javascript
{
  "type": "n8n-nodes-base.whatsapp",
  "name": "Send WhatsApp",
  "parameters": {
    "operation": "sendMessage",
    "phoneNumber": "={{$json.pacienteTelefone}}",  // +55 11 99999-9999
    "message": "=`Olá {{$json.pacienteNome}}, seu agendamento foi confirmado para {{$json.data}} às {{$json.hora}}. Clínica Dental. Tel: (11) 3000-0000`",
    "options": {
      "preview_url": true
    }
  }
}
```

**Enviar com Template (Meta):**
```javascript
{
  "type": "n8n-nodes-base.whatsapp",
  "name": "Send Template",
  "parameters": {
    "operation": "sendTemplate",
    "phoneNumber": "={{$json.pacienteTelefone}}",
    "template": "agendamento_confirmado",
    "templateLanguage": "pt_BR",
    "templateParameters": [
      "={{$json.pacienteNome}}",
      "={{$json.data}}",
      "={{$json.hora}}",
      "={{$json.dentistaname}}"
    ]
  }
}
```

**Templates Recomendados:**
- `agendamento_confirmado` - Enviado ao agendar
- `lembrete_24h` - Enviado 24h antes
- `orcamento_aguardando` - Após criar orçamento
- `orcamento_aprovado` - Após aprovação

---

### 1.4 EMAIL

**Tipo:** `nodes-base.emailSend` com Sendgrid

**Configuração:**
```javascript
{
  "type": "n8n-nodes-base.emailSend",
  "name": "Send Email",
  "parameters": {
    "fromEmail": "agendamentos@clinica.com.br",
    "toEmail": "={{$json.pacienteEmail}}",
    "subject": "=`Agendamento Confirmado - {{$json.data}} às {{$json.hora}}`",
    "textOnly": false,
    "htmlEmail": "=`
      <html>
        <body style='font-family: Arial, sans-serif;'>
          <h2>Agendamento Confirmado</h2>
          <p>Olá <strong>{{$json.pacienteNome}}</strong>,</p>
          <p>Seu agendamento foi confirmado com sucesso:</p>
          <ul>
            <li><strong>Data:</strong> {{$json.data}}</li>
            <li><strong>Hora:</strong> {{$json.hora}}</li>
            <li><strong>Procedimento:</strong> {{$json.procedimento}}</li>
            <li><strong>Dentista:</strong> Dr. {{$json.dentistaname}}</li>
          </ul>
          <p>Caso precise reagendar, entre em contato conosco.</p>
          <p>Obrigado!</p>
        </body>
      </html>
    `",
    "options": {
      "attachBinaries": false
    }
  }
}
```

**Com Arquivo Anexado (Orçamento PDF):**
```javascript
{
  "type": "n8n-nodes-base.emailSend",
  "name": "Send Budget PDF",
  "parameters": {
    "fromEmail": "orcamentos@clinica.com.br",
    "toEmail": "={{$json.pacienteEmail}}",
    "subject": "=`Seu Orçamento Odontológico - {{$json.data}}`",
    "htmlEmail": "=`Orçamento em anexo`,",
    "options": {
      "attachBinaries": true
    }
  }
}
```

---

## 2. Configuração de Webhook

### Fluxo Completo: Novo Agendamento

```
FRONTEND (Next.js)
    ↓
    fetch('/api/webhook/agendamento', {
      method: 'POST',
      body: JSON.stringify({
        pacienteId, pacienteNome, pacienteTelefone, pacienteEmail,
        data, hora, procedimento, dentistaId
      })
    })
    ↓
WEBHOOK (n8n)
    ↓
[1] Validar dados (IF node)
    ↓ sucesso
[2] Salvar em Data Table (agendamentos_log)
    ↓
[3] Enviar WhatsApp
    ↓
[4] Enviar Email
    ↓
[5] Atualizar Supabase (HTTP Request)
    ↓
[6] Response ao frontend
```

### Exemplo de Workflow JSON

```json
{
  "nodes": [
    {
      "id": "webhook_trigger",
      "type": "n8n-nodes-base.webhook",
      "name": "Webhook",
      "parameters": {
        "httpMethod": "POST",
        "path": "agendamento"
      },
      "position": [0, 0]
    },
    {
      "id": "validate_data",
      "type": "n8n-nodes-base.if",
      "name": "Validar Dados",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.pacienteEmail}}",
              "operation": "notEmpty"
            },
            {
              "value1": "={{$json.data}}",
              "operation": "notEmpty"
            }
          ]
        }
      },
      "position": [200, 0]
    },
    {
      "id": "save_log",
      "type": "n8n-nodes-base.dataTable",
      "name": "Save Log",
      "parameters": {
        "operation": "insertRows",
        "tableName": "agendamentos_log",
        "dataToInsert": {
          "paciente_email": "={{$json.pacienteEmail}}",
          "paciente_nome": "={{$json.pacienteNome}}",
          "data_agendamento": "={{$json.data}}",
          "hora": "={{$json.hora}}",
          "status": "pendente",
          "timestamp": "={{new Date().toISOString()}}"
        }
      },
      "position": [400, 0]
    }
  ],
  "connections": {
    "webhook_trigger": {
      "main": [[{"node": "validate_data", "type": "main", "index": 0}]]
    },
    "validate_data": {
      "main": [
        [{"node": "save_log", "type": "main", "index": 0}],
        [{"node": "error_handler", "type": "main", "index": 0}]
      ]
    }
  }
}
```

---

## 3. Integração WhatsApp

### Setup Inicial

**Credenciais Necessárias:**
1. Meta Business Account
2. WhatsApp Business Account (ou número pessoal para testes)
3. Permanent Access Token
4. Phone Number ID
5. Business Account ID

**Configurar em n8n:**
1. Ir para Credentials
2. Criar nova: "WhatsApp Business"
3. Colar: Phone Number ID, Business Account ID, Access Token
4. Testar conexão

### Templates WhatsApp (Meta Approved)

**Template 1: Confirmação**
```
Olá {{1}}, 
Seu agendamento foi confirmado para {{2}} às {{3}} com {{4}}.
Clínica Dental
Tel: (11) 3000-0000
```

**Variáveis:** 1=Nome, 2=Data, 3=Hora, 4=Dentista

**Template 2: Lembrete 24h**
```
Olá {{1}},
Lembramos que você tem agendamento amanhã às {{2}} com Dr. {{3}}.
Confirme presença ou ligue: (11) 3000-0000
```

**Template 3: Disponibilidade**
```
Olá {{1}},
Temos horários disponíveis:
{{2}}
{{3}}
Clique para agendar!
```

### Fluxo WhatsApp: Lembrete Automático

```json
{
  "nodes": [
    {
      "id": "scheduler",
      "type": "n8n-nodes-base.schedulerTrigger",
      "parameters": {
        "rule": {
          "interval": [1],
          "intervalUnit": "day",
          "triggerAtHour": 9
        }
      },
      "name": "Diariamente às 09:00"
    },
    {
      "id": "get_appointments",
      "type": "n8n-nodes-base.dataTable",
      "parameters": {
        "operation": "getRows",
        "tableName": "agendamentos_log",
        "filter": {
          "filters": [
            {
              "columnName": "data_agendamento",
              "condition": "eq",
              "value": "={{new Date(new Date().getTime() + 24*60*60*1000).toISOString().split('T')[0]}}"
            },
            {
              "columnName": "status",
              "condition": "eq",
              "value": "pendente"
            }
          ]
        }
      }
    },
    {
      "id": "send_whatsapp",
      "type": "n8n-nodes-base.whatsapp",
      "parameters": {
        "operation": "sendTemplate",
        "phoneNumber": "={{$json.paciente_telefone}}",
        "template": "lembrete_24h",
        "templateLanguage": "pt_BR",
        "templateParameters": [
          "={{$json.paciente_nome}}",
          "={{$json.hora}}",
          "={{$json.dentista_nome}}"
        ]
      }
    }
  ]
}
```

---

## 4. Integração Email

### Configurar SMTP

**Opção 1: Gmail (OAuth)**
```
1. Criar App Password em Google Account
2. Credentials > Nova credencial > Gmail (OAuth)
3. Copiar credenciais
4. Colar em n8n
```

**Opção 2: Sendgrid (API Key)**
```
1. Sendgrid > Settings > API Keys > Create
2. Credentials > Nova credencial > Sendgrid
3. Colar API Key
4. Verified Sender Email obrigatório
```

### Templates de Email (HTML)

**Template 1: Confirmação de Agendamento**

Arquivo: `/email_templates/confirmacao_agendamento.html`

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #A8D5C2; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px; border: 1px solid #EFEFEF; }
        .details { background: #F8F8F8; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 15px; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Agendamento Confirmado</h2>
        </div>
        <div class="content">
            <p>Olá <strong>{{paciente_nome}}</strong>,</p>
            <p>Seu agendamento foi confirmado com sucesso!</p>
            
            <div class="details">
                <strong>Detalhes do Agendamento:</strong><br>
                📅 <strong>Data:</strong> {{data_formatada}}<br>
                🕒 <strong>Hora:</strong> {{hora}}<br>
                🦷 <strong>Procedimento:</strong> {{procedimento}}<br>
                👨‍⚕️ <strong>Dentista:</strong> Dr. {{dentista_nome}}<br>
                📍 <strong>Endereço:</strong> [Endereço da Clínica]<br>
                📞 <strong>Telefone:</strong> (11) 3000-0000
            </div>
            
            <p><strong>Informações Importantes:</strong></p>
            <ul>
                <li>Chegue 10 minutos antes do horário marcado</li>
                <li>Leve seu documento de identidade</li>
                <li>Em caso de dúvidas, ligue para nós</li>
            </ul>
            
            <p style="background: #FFF3CD; padding: 10px; border-radius: 4px;">
                ⚠️ Se precisar desmarcar, avise com antecedência de 24h
            </p>
        </div>
        <div class="footer">
            <p>Clínica Dental | (11) 3000-0000 | contato@clinica.com.br</p>
            <p>© 2026 - Todos os direitos reservados</p>
        </div>
    </div>
</body>
</html>
```

---

## 5. Data Tables

### Criar Tabelas Necessárias

**Tabela 1: agendamentos_log**
```javascript
n8n_manage_datatable({
  action: "createTable",
  name: "agendamentos_log",
  columns: [
    {name: "id", type: "string"},
    {name: "paciente_id", type: "string"},
    {name: "paciente_nome", type: "string"},
    {name: "paciente_email", type: "string"},
    {name: "paciente_telefone", type: "string"},
    {name: "data_agendamento", type: "date"},
    {name: "hora", type: "string"},
    {name: "procedimento", type: "string"},
    {name: "dentista_id", type: "string"},
    {name: "dentista_nome", type: "string"},
    {name: "status", type: "string"},  // pendente, confirmado, cancelado
    {name: "lembrete_enviado", type: "boolean"},
    {name: "timestamp", type: "date"},
    {name: "webhook_payload", type: "string"}
  ]
})
```

**Tabela 2: mensagens_whatsapp**
```javascript
n8n_manage_datatable({
  action: "createTable",
  name: "mensagens_whatsapp",
  columns: [
    {name: "id", type: "string"},
    {name: "paciente_telefone", type: "string"},
    {name: "tipo_mensagem", type: "string"},  // confirmacao, lembrete, orcamento
    {name: "conteudo", type: "string"},
    {name: "timestamp_enviada", type: "date"},
    {name: "status", type: "string"},  // enviado, entregue, lido
    {name: "agendamento_id", type: "string"}
  ]
})
```

### Consultar Data Table

```javascript
{
  "type": "n8n-nodes-base.dataTable",
  "parameters": {
    "operation": "getRows",
    "tableName": "agendamentos_log",
    "limit": 100,
    "sort": {
      "column": "timestamp",
      "direction": "DESC"
    },
    "filter": {
      "filters": [
        {
          "columnName": "status",
          "condition": "eq",
          "value": "pendente"
        },
        {
          "columnName": "data_agendamento",
          "condition": "gte",
          "value": "={{new Date().toISOString().split('T')[0]}}"
        }
      ]
    }
  }
}
```

---

## 6. Code Nodes

### Code Node: Formatar Data para PT-BR

```javascript
// JavaScript Code Node
const data = new Date($json.data);
const opcoes = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

$json.data_formatada = data.toLocaleDateString('pt-BR', opcoes)
  .replace(/^\w/, c => c.toUpperCase());

// Resultado: "terça-feira, 15 de abril de 2026"

return $json;
```

### Code Node: Validar Email

```javascript
const email = $json.pacienteEmail;
const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!regex.test(email)) {
  throw new Error(`Email inválido: ${email}`);
}

$json.email_valido = true;
return $json;
```

### Code Node: Calcular Próximo Lembrete

```javascript
const dataAgendamento = new Date($json.data);
const agora = new Date();

// Subtrair 1 dia para lembrete
const dataLembrete = new Date(dataAgendamento.getTime() - 24*60*60*1000);

if (dataLembrete > agora) {
  $json.proxima_execucao = dataLembrete.toISOString();
  $json.enviar_lembrete = true;
} else {
  $json.enviar_lembrete = false;
}

return $json;
```

---

## 7. Tratamento de Erros

### Padrão: Try-Catch em Workflow

```json
{
  "nodes": [
    {
      "id": "send_whatsapp",
      "type": "n8n-nodes-base.whatsapp",
      "name": "Send WhatsApp"
    },
    {
      "id": "error_handler",
      "type": "n8n-nodes-base.httpRequest",
      "name": "Log Error",
      "parameters": {
        "url": "=`{{$env.LOG_SERVICE_URL}}/errors`",
        "method": "POST",
        "body": "={{JSON.stringify({
          error: $input.item.error?.message || 'Unknown error',
          node: 'send_whatsapp',
          timestamp: new Date().toISOString(),
          context: $json
        })}}"
      }
    }
  ],
  "connections": {
    "send_whatsapp": {
      "main": [[{node: "success_handler"}]],
      "error": [[{node: "error_handler"}]]
    }
  }
}
```

### Retry Strategy

```javascript
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "options": {
      "retryCount": 3,
      "retryInterval": 2000,  // 2 segundos entre tentativas
      "retryOnStatusCodes": [408, 429, 500, 502, 503, 504]
    }
  }
}
```

### Log Centralizado

Todas as requisições devem logar em arquivo central:

```javascript
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "={{$env.N8N_LOG_URL}}/workflow",
    "method": "POST",
    "body": "={{JSON.stringify({
      workflow_id: '{{$workflow.id}}',
      workflow_name: '{{$workflow.name}}',
      execution_id: '{{$execution.id}}',
      node_name: $node.current.name,
      status: 'started',
      payload: $json,
      timestamp: new Date().toISOString()
    })}}"
  }
}
```

---

## Variáveis de Ambiente Necessárias

Adicionar em `.env.local`:

```bash
# n8n
N8N_API_URL=https://n8n.geraresistemas.com.br
N8N_API_KEY=eyJhbGciOiJIUzI1NiIs...

# WhatsApp
WHATSAPP_PHONE_ID=123456789
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxx...

# Email
EMAIL_SENDGRID_API_KEY=SG.xxx...
EMAIL_FROM=agendamentos@clinica.com.br

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...

# Logging
N8N_LOG_URL=https://log-service.example.com
```

---

**Próxima Etapa:** Implementar Phase 1 - Webhook Básico com Data Table logging.
