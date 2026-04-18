# CLAUDE.md — DentClinic Next

Arquivo lido automaticamente pelo Claude Code no início de cada conversa.
**Sistema:** DentClinic Next (Gestão de Clínica Odontológica)
**Stack:** Next.js 15 · React 19 · TypeScript · Supabase (PostgreSQL) · Inline Styles

---

## Visão Geral

Sistema de gestão para clínicas odontológicas com módulos de Agenda, Prontuários, Pacientes, Orçamentos, Procedimentos, Financeiro e Estoque. Multi-dentista com controle de perfil (Dentista/Secretária/Super Admin).

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Inline Styles (sem Tailwind) |
| Ícones | Lucide React (SVG inline) |
| Formulários | React Hook Form (nativo com onChange) |
| Armazenamento | **Supabase (PostgreSQL)** — agendamentos, dentistas, pacientes, clínicas, usuários |
| Auth | `/api/auth/login` → tabela `usuarios` + bcrypt + localStorage (sessão do lado cliente) |
| API Routes | Next.js API Routes com `supabase-js` (service_role) — sem exposição de chaves no cliente |
| Gráficos | Simples (CSS puro para agora) |
| Datas | Date nativo (Date()), toLocaleDateString('pt-BR') |

---

## Arquitetura Multi-Usuário (Multi-Dentista)

### Autenticação & Perfis
- **Login:** `POST /api/auth/login` → busca `usuarios` no Supabase, verifica senha com bcrypt (fallback SHA-256 legado)
- **Sessão:** localStorage mantém a sessão do lado cliente após login
  - `dentclinic_logged_in` — flag de autenticação
  - `dentclinic_role` — `'dentista'` | `'secretaria'` | `'super_admin'`
  - `dentclinic_name` — nome do usuário logado
  - `dentclinic_user_id` — id do usuário (para queries filtradas)
  - `dentclinic_clinica_id` — clinica_id associada ao usuário
- **AuthGuard:** Bloqueia acesso sem autenticação, redireciona para `/login`
- **RLS Local:** Sidebar filtra menu por role (`filteredNavItems`)
- **Proteção de Rotas:** AuthGuard redireciona Secretária de `/prontuario`, `/relatorios`, `/configuracoes`

### Roles & Permissões
| Perfil | Dashboard | Agenda | Prontuário | Pacientes | Orçamento | Financeiro | Estoque | Relatórios | Config |
|---|---|---|---|---|---|---|---|---|---|
| **Dentista** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Secretária** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Estrutura de Pastas

```
app/                      → Páginas (Next.js App Router)
  (app)/                  → Route group (protegido por AuthGuard)
    dashboard/            → Dashboard principal
    agenda/               → Agendamentos de pacientes
    prontuario/           → Prontuários (Odontograma, Anamnese, etc)
    pacientes/            → Cadastro de pacientes
    orcamento/            → Orçamentos e planos de tratamento
    precos/               → Cadastro de procedimentos (Preços)
    financeiro/           → Contas a pagar/receber
    estoque/              → Produtos/Materiais
    configuracoes/        → Usuários, Clínica, Procedimentos
    super-admin/          → Cadastro de dentistas (novo)
  login/                  → Tela de login

components/               → Componentes reutilizáveis
  UI.jsx                  → Button, Badge, Card, PageHeader, KpiCard
  Sidebar.jsx             → Menu lateral (dinâmico por role)
  AuthGuard.jsx           → Proteção de rotas

.claude/                  → Documentação do projeto
  memory/                 → Memória persistente de contexto
    project_roadmap.md    → Roadmap e funcionalidades
    funcionalidades_prontas.md → Status de cada módulo
```

---

## Módulos & Rotas

### 🟢 PRONTO (Com CRUD + localStorage)
| Rota | Função | Status |
|---|---|---|
| `/agenda` | Agendamentos da semana | ✅ CREATE/READ/UPDATE/DELETE |
| `/pacientes` | Lista e cadastro de pacientes | ✅ CREATE/READ/UPDATE/DELETE |
| `/orcamento` | Orçamentos com cálculo automático | ✅ CREATE/READ/UPDATE/DELETE |
| `/precos` | Cadastro de procedimentos | ✅ CREATE/READ/UPDATE/DELETE |
| `/login` | Autenticação com seleção de perfil | ✅ Roles dinâmicos |

### 🟢 PRONTO (com dados reais Supabase)
| Rota | Função | Status |
|---|---|---|
| `/dashboard` | KPIs + próxima consulta + gráfico semanal | ✅ Consultas hoje, taxa de confirmação, consultas na semana, pacientes ativos, gráfico semana (Seg-Sex) — tudo via Supabase filtrado por `clinica_id` |
| `/agenda` | Calendário Semana/Dia multi-dentista + bloqueios | ✅ CRUD completo via `useAgendamento.ts` + `/api/bloqueios` — **UI refinada**: paleta harmonizada, modais em gradiente escuro, chips filtro dentistas, botão Hoje, linha "agora", altura do bloco pela duração, KPI cards padrão Dashboard |

### 🟡 PARCIALMENTE PRONTO (Interface OK, dados mock)
| Rota | Função | Status |
|---|---|---|
| `/financeiro` | Contas a pagar/receber | Interface pronta, dados estáticos |
| `/estoque` | Controle de materiais | Interface pronta, sem CRUD |
| `/prontuario` | Prontuários com odontograma | Interface completa, dados estáticos |
| `/configuracoes` | Usuários, clínica, procedimentos | Parcial, abas prontas |

### 🟢 PRONTO (Super Admin)
| Rota | Função | Status |
|---|---|---|
| `/super-admin/clinicas` | Cadastro de clínicas (multi-tenant) | ✅ CREATE/READ/UPDATE/DELETE |
| `/super-admin/dentistas` | Cadastro de dentistas com clínica | ✅ CREATE/READ/UPDATE/DELETE |
| `/super-admin/integracoes` | WhatsApp + n8n + Templates | ✅ CONFIG/TEMPLATES/AUTOMAÇÕES |

---

## Banco de Dados — Estrutura (Supabase PostgreSQL)

### Estado de Migração
| Dados | Onde está |
|---|---|
| `agendamentos` | ✅ Supabase (`agendamentos`) via `useAgendamento.ts` |
| `dentistas` | ✅ Supabase (`dentistas`) — buscados por `clinica_id` + `status=ativo` |
| `pacientes` | ✅ Supabase (`pacientes`) — buscados direto com `supabase-client` |
| `clinicas` | ✅ Supabase (`clinicas`) — via `/api/clinica` (service_role) |
| `usuarios` | ✅ Supabase (`usuarios`) — login via `/api/auth/login` |
| `orcamentos` | ⏳ localStorage (`orcamentos`) |
| `precos` | ⏳ localStorage (`precos`) |
| `estoque` | ⏳ localStorage (sem CRUD) |
| Sessão cliente | localStorage (`dentclinic_*`) |
| Bloqueios de agenda | ✅ Supabase via `/api/bloqueios` (dia_semana / data / horario) |
| Config WhatsApp | localStorage (`integracao_whatsapp`) |

### API Routes disponíveis
| Rota | Método | Função |
|---|---|---|
| `/api/auth/login` | POST | Autenticação com email+senha (bcrypt) |
| `/api/clinica` | GET, PATCH | Listar/atualizar clínicas |
| `/api/dentistas/reset-password` | POST | Reset de senha de dentista |
| `/api/usuarios` | GET, POST, PATCH | CRUD de usuários |
| `/api/secretarias` | GET, POST | Gestão de secretárias |
| `/api/admin/create-user` | POST | Criar usuário admin |
| `/api/migrate` | POST | Migração de dados |
| `/api/bloqueios` | GET, POST, DELETE | CRUD de bloqueios de agenda (dia_semana / data / horario) |
| `/api/n8n/agendamento` | POST | Receber agendamento via n8n/WhatsApp |
| `/api/n8n/dentistas` | GET | Listar dentistas para n8n |
| `/api/n8n/clinica` | GET | Dados da clínica para n8n |
| `/api/n8n/disponibilidade` | GET | Horários disponíveis para n8n |
| `/api/n8n/sessao` | GET | Dados de sessão para n8n |

### Hooks
| Hook | Arquivo | Função |
|---|---|---|
| `useAgendamento` | `app/hooks/useAgendamento.ts` | CRUD completo de agendamentos no Supabase |

### Schema Supabase PostgreSQL
**Tabela: `clinicas`**
```sql
id UUID PRIMARY KEY
nome VARCHAR NOT NULL
cnpj VARCHAR UNIQUE NOT NULL
cpf VARCHAR NOT NULL
responsavel VARCHAR
email VARCHAR
telefone VARCHAR
endereco VARCHAR
cidade VARCHAR
status ENUM('ativo', 'inativo') DEFAULT 'ativo'
criado_em TIMESTAMP
```

**Tabela: `dentistas`** (Super Admin)
```sql
id UUID PRIMARY KEY
clinica_id UUID FOREIGN KEY (references clinicas.id)
nome VARCHAR NOT NULL
email VARCHAR NOT NULL
cro VARCHAR NOT NULL (Conselho Regional de Odontologistas)
especialidade VARCHAR
status ENUM('ativo', 'inativo') DEFAULT 'ativo'
criado_em TIMESTAMP
```

**Tabela: `agendamentos`**
```sql
id UUID PRIMARY KEY
clinica_id UUID
dentista_id UUID
paciente VARCHAR
data DATE
hora TIME
procedimento VARCHAR
duracao VARCHAR
status ENUM('confirmado', 'pendente')
observacoes TEXT
criado_em TIMESTAMP
```

**Tabela: `pacientes`**
```sql
id UUID PRIMARY KEY
clinica_id UUID
nome VARCHAR
cpf VARCHAR UNIQUE
telefone VARCHAR
email VARCHAR
nascimento DATE
convenio VARCHAR
ultima_visita DATE
status ENUM('ativo', 'inativo')
criado_em TIMESTAMP
```

---

## Padrões de Código

### Componentes
```typescript
// Padrão de página: 'use client' + useState + localStorage
'use client';
import { useState, useEffect } from 'react';
import { Button, Card, PageHeader } from '@/components/UI';

export default function Page() {
  const [dados, setDados] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('chave');
    if (saved) setDados(JSON.parse(saved));
  }, []);

  const salvar = (novos) => {
    localStorage.setItem('chave', JSON.stringify(novos));
    setDados(novos);
  };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Título" />
      {/* conteúdo */}
    </div>
  );
}
```

### Estilos (Inline — sem Tailwind)
```javascript
const s = {
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#F8F8F8' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 12, fontWeight: 500, color: '#888' },
  td: { padding: '14px 12px', borderBottom: '1.5px solid #EFEFEF', fontSize: 13 },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 },
};
```

### Cores & Tipografia
- **Background:** `#F8F8F8` (página), `#fff` (cards)
- **Texto principal:** `#1A1A1A`
- **Texto secundário:** `#888`, `#AAA`
- **Accent (marca):** `#A8D5C2` (mint)
- **Borders:** `#EFEFEF`, `#E8E8E8`
- **Fonte corpo:** `'DM Sans', sans-serif`
- **Fonte títulos:** `'DM Serif Display', serif`
- **Border radius:** `8px` (inputs), `12px` (cards), `50%` (avatares)

---

## Funcionalidades Prontas

### ✅ Agenda (CRUD Completo — Supabase, UI refinada)
- **CREATE:** Modal "Novo agendamento" com seções (Paciente / Consulta / Observações) e header dark gradient
- **READ:** Calendário Semana/Dia com blocos coloridos por dentista (paleta harmonizada: mint, azul, âmbar, púrpura, coral...)
- **UPDATE:** Clique no agendamento → modal detalhe dark gradient → botão Editar
- **DELETE:** Modal detalhe com botão "Cancelar" (delete com confirmação)
- **Supabase:** tabela `agendamentos` via hook `useAgendamento.ts`
- **Dentistas:** buscados do Supabase (`dentistas` filtrado por `clinica_id + status=ativo`)
- **Pacientes autocomplete:** buscados do Supabase (`pacientes`)
- **Clínica:** obtida via `GET /api/clinica` (service_role), fallback de `localStorage.dentclinic_clinica_id`
- **Filtro dentistas:** chips toggle coloridos com contador (≤6) ou select (>6)
- **Vista:** Semana (Seg-Sáb) e Dia (multi-dentista por colunas com avatar de iniciais)
- **Bloqueios:** dias da semana, datas avulsas e horários → `/api/bloqueios` (Supabase)
- **UX:**
  - Botão "Hoje" volta à data atual em qualquer vista
  - Linha vermelha "agora" (com dot pulsante) na coluna do dia de hoje
  - Altura do bloco de agendamento reflete `a.duracao` (não mais 60 min fixo)
  - Clique em célula vazia cria agendamento (cursor copy)
  - Hover em blocos com lift + shadow
  - Iniciais corretas de dentistas (primeiro + último nome)
  - Próxima consulta marcada com tag "AGORA" mint no sidebar
  - Sidebar "Hoje" com "+N mais" / "Recolher" quando > 5 agendamentos
- **Visual:**
  - KPI cards padrão Dashboard (grid 4 colunas) — substituindo o antigo KPI strip
  - Modais em `linear-gradient(135deg, #1C1C1E, #2C2C2E)` com close `<X>` lucide em badge translúcido
  - Toast com ícones lucide (`CheckCircle2`/`XCircle`) em vez de emoji
  - "Bloquear Agenda" renomeado para "Dias sem atendimento" (com ícone `CalendarOff`)
  - Skeleton shimmer na vista de calendário durante carregamento
  - Background `#F8F8F8` (era `#F5F6FA`)

### ✅ Dashboard (Dados reais — Supabase)
- **Banner:** Saudação dinâmica (bom dia/tarde/noite) + data capitalizada + bloco "Próxima consulta" com dot pulsante
- **Banner button:** Ghost translúcido (não o antigo mint chamativo) → abre agenda
- **4 KPIs reais:**
  - Consultas hoje (barra = taxa de confirmação) — mint
  - Taxa de confirmação (% confirmados / total hoje) — azul
  - Consultas na semana (query Seg-Sex agrupada por data) — cinza neutro
  - Pacientes ativos (count Supabase filtrado por `clinica_id` + `status=ativo`) — cinza neutro
- **Card "Consultas de hoje":** Lista completa com destaque mint + tag "AGORA" na próxima
- **Gráfico semanal:** Consultas por dia Seg-Sex com dados reais do Supabase (sem mock)
- **Ações rápidas:** 2x2 com ícones cinza uniformes (paleta reduzida)
- **Grid inferior:** "Alertas de retorno" + "Estoque crítico" (2 cards placeholder com subtítulos explicativos, ícones neutros)

### ✅ Pacientes (CRUD — Supabase, UI refinada)
- **CREATE:** "Novo Paciente" → modal com seções (Dados pessoais / Contato / Atendimento), 2 colunas
- **READ:** Tabela com hover por linha, avatar colorido `{bg, text}` harmônico, CPF embaixo do nome
- **UPDATE:** Menu kebab (⋮) → Editar → modal
- **DELETE:** Menu kebab (⋮) → Excluir → confirmação
- **Supabase:** tabela `pacientes` (query direta via `supabase-client`, filtro por `clinica_id`)
- **KPIs dinâmicos:** Total cadastrado (% ativos na barra), Ativos, Novos este mês (meta 20)
- **Filtros:** chips toggle (Todos / Ativos / Inativos) com contadores em pill
- **Botão Prontuário:** primário azul claro com ícone, ao lado do kebab
- **Skeleton shimmer + empty state:** ícone em círculo pastel + CTA preto

### ✅ Orçamento (CRUD Completo)
- **CREATE:** "Novo Orçamento" → seleção de procedimentos
- **READ:** Tabela com status (rascunho, aguardando, aprovado, recusado)
- **UPDATE:** "Editar" → modal → salva
- **DELETE:** "Excluir" → confirmação → remove
- **Cálculo automático:** subtotal, desconto %, total, parcelas (1x-12x)
- **localStorage:** `orcamentos` array

### ✅ Procedimentos/Preços (CRUD Completo)
- **CREATE:** "+ Novo Procedimento"
- **READ:** Tabela com busca/filtro por categoria
- **UPDATE:** "Editar" → modal → salva
- **DELETE:** "Excluir" → remove
- **localStorage:** `precos` array

### ✅ Autenticação & Perfis
- **Login:** Seleção de perfil (Dentista/Secretária/Super Admin)
- **Proteção:** AuthGuard bloqueia sem autenticação
- **Menu dinâmico:** Sidebar filtra itens por role
- **Logout:** Remove `dentclinic_logged_in`, `dentclinic_role`, `dentclinic_name`

### ✅ Super Admin - Gerenciar Clínicas (CRUD Completo — Supabase)
- **CREATE:** "+ Nova Clínica" → nome, CNPJ, CPF, responsável, endereço, cidade
- **READ:** Tabela com busca por nome/CNPJ/CPF/cidade
- **READ Dentistas:** Modal de edição mostra dentistas vinculados
- **UPDATE:** "Editar" → modal → salva dados + visualiza dentistas
- **DELETE:** "Excluir" → confirmação → remove
- **Supabase:** tabela `clinicas`
- **KPIs dinâmicas:** Total, Ativas, Inativas
- **Count:** Exibe quantidade de dentistas por clínica

### ✅ Super Admin - Integrações (WhatsApp + n8n)
- **Configuração por Clínica:** Cada clínica tem sua própria configuração
- **WhatsApp Setup:**
  - Número com código do país
  - Nome de exibição
  - API Token (mascarado no formulário)
  - Status: Ativo/Inativo
  - Teste de conexão
- **N8N Setup:**
  - Webhook URL (para disparar workflow)
  - Token de autenticação
  - Status: Ativo/Inativo
  - Teste de webhook
- **Templates de Mensagem:**
  - Boas-vindas (ao cliente iniciar chat)
  - Confirmação (após agendar)
  - Lembrete 24h (antes da consulta)
  - Disponibilidade (lista de horários)
  - Suporte a variáveis: {{clinica}}, {{dentista}}, {{data}}, {{hora}}
- **Automações:**
  - Enviar lembrete 24h antes
  - Criar agendamento automático
  - Enviar confirmação por SMS
- **Histórico:**
  - Tabela de agendamentos feitos via WhatsApp
  - Cliente, Dentista, Data/Hora, Status
  - Filtrável por clínica

### ✅ Super Admin - Gerenciar Dentistas (CRUD Completo — Supabase)
- **CREATE:** "+ Novo Dentista" → seleção de clínica obrigatória, CRO, especialidade
- **READ:** Tabela com busca por nome/email/CRO, filtra por clínica
- **UPDATE:** "Editar" → modal → salva com reatribuição de clínica
- **DELETE:** "Excluir" → confirmação → remove
- **Supabase:** tabela `dentistas` (filtrada por `clinica_id`)
- **Associação:** Cada dentista vinculado a uma clínica (multi-tenant)
- **KPIs dinâmicas:** Total, Ativos, Especialidades distintas

---

## Variáveis de Ambiente (`.env.local`)

```
# Supabase (quando migrar do localStorage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Opcional: Google GenAI para IA em prontuários
GOOGLE_GENAI_API_KEY=
```

---

## Ambiente de Produção

| Item | Valor |
|---|---|
| Plataforma | Vercel |
| Projeto | dentclinic-next |
| URL | https://dentclinic-next.vercel.app |
| Node | 24.x |
| Framework | Next.js 15 |

---

## Regras de Negócio

### Clínicas (Multi-tenant)
1. Nome, CNPJ, CPF obrigatórios
2. CPF = número de registro/CPF do responsável
3. Status: `ativo` ou `inativo`
4. Pode ter múltiplos dentistas vinculados
5. Isolamento de dados por `clinica_id`

### Dentistas
1. Nome, Email, CRO, Clínica obrigatórios
2. CRO = Conselho Regional de Odontologistas
3. Deve estar vinculado a uma clínica
4. Status: `ativo` ou `inativo`
5. Especialidade: opcional (para filtros futuros)

### Agendamentos
1. Paciente obrigatório
2. Data/hora preenchidas
3. Procedimento selecionado
4. Dentista atribuído
5. Status padrão: `pendente` (pode mudar para `confirmado`)

### Orçamentos
1. Mínimo 1 procedimento selecionado
2. Cálculo automático: `subtotal = Σ(preco × quantidade)`
3. `total = subtotal - desconto`
4. Parcelamento: valor/parcela calculado automaticamente
5. Status ao criar: `rascunho` ou `aprovado` (conforme botão)

### Pacientes
1. Nome, CPF, telefone, email obrigatórios
2. Data última visita atualiza ao agendar
3. Status: `ativo` ou `inativo`

---

## Próximas Implementações (Roadmap)

### ✅ IMPLEMENTADO
- [x] **Agenda** — CRUD completo no Supabase via `useAgendamento.ts`, vista Semana/Dia, multi-dentista + UI refinada (paleta harmonizada, chips filtro, modais dark, linha "agora", botão Hoje, altura pela duração, KPI cards)
- [x] **Bloqueios de agenda** — API `/api/bloqueios` (dia_semana / data / horario) no Supabase
- [x] **Autenticação** — `/api/auth/login` + tabela `usuarios` + bcrypt
- [x] **Super Admin - Clínicas** — CRUD no Supabase, `/api/clinica`
- [x] **Super Admin - Dentistas** — CRUD no Supabase, filtrado por `clinica_id`
- [x] **Super Admin - Integrações** — WhatsApp + n8n + templates + automações
- [x] **Pacientes** — CRUD no Supabase + UI refinada (kebab, chips, modal em seções)
- [x] **Dashboard** — Dados reais do Supabase (KPIs, próxima consulta, gráfico semanal Seg-Sex, pacientes ativos)
- [x] **API Routes n8n** — agendamento, dentistas, clínica, disponibilidade, sessão

### 🔴 CRÍTICO
- [ ] Migrar Orçamentos de localStorage para Supabase
- [ ] Migrar Preços/Procedimentos de localStorage para Supabase

### 🟡 IMPORTANTE
- [ ] Conectar Dashboard a Faturamento quando módulo financeiro existir
- [ ] CRUD completo para Estoque (entrada/saída de materiais)
- [ ] Sincronizar Prontuário com Pacientes
- [ ] Relatórios dinâmicos (Financeiro, Procedimentos por dentista)
- [ ] Aplicar padrão visual refinado (kebab, chips, shimmer) em Orçamento, Preços

### 🟢 NICE-TO-HAVE
- [ ] Tema escuro
- [ ] App mobile (React Native)
- [ ] Notificações push (agendamentos)
- [ ] Integração com calendário Google


---

## Convenções Importantes

- **Português no código:** variáveis, funções, comentários em português
  - ✅ `carregarAgendamentos`, `pacientesFiltrados`, `salvarNoLocalStorage`
  - ❌ `loadAppointments`, `filteredPatients`, `saveToStorage`

- **Nunca criar arquivo sem necessidade** — preferir editar existentes

- **Supabase é a fonte de verdade** para agendamentos, dentistas, pacientes, clínicas e usuários
  - localStorage usado apenas para sessão (`dentclinic_*`) e dados ainda não migrados (orçamentos, preços, bloqueios)
  - Queries via `supabase-client` direto no cliente, ou via API Routes com service_role quando necessário

- **Inline styles only** — zero Tailwind, zero CSS modules
  - `const s = { ... }` no final de cada componente
  - Cores padronizadas: mint (`#A8D5C2`), dark (`#1A1A1A`), muted (`#888`)
  - Background de página: sempre `#F8F8F8` (nunca `#F5F6FA` ou outros)

- **Padrões de Design refinados (aplicados em Pacientes, Dashboard e Agenda)** — usar como referência ao revisar outras telas:
  - **Tabelas:** sem zebra; hover por linha em `#FAFAFA` via `useState(hoverRowId)`; header `<th>` fundo `#fff` (evita colisão com card arredondado); `overflow: visible` no card da tabela para permitir dropdowns
  - **Ações em tabela:** botão primário visível (ex: "Prontuário") + menu kebab (⋮) para secundárias (Editar, Excluir). Kebab abre dropdown `position:absolute` com overlay invisível `fixed inset:0 zIndex:10` para fechar ao clicar fora
  - **Filtros:** chips toggle em container `background:#F5F5F5 padding:3 borderRadius:8`, com contador em pill — em vez de `<select>`
  - **Modal de formulário:** header em gradiente escuro `linear-gradient(135deg,#1C1C1E,#2C2C2E)`; corpo dividido em seções (título uppercase `#AAA letterSpacing:1px` + linha tracejada `borderBottom:'1px dashed #F0F0F0'`); footer com borda superior separando ações; `maxWidth:580` com `formRow grid 1fr 1fr` para campos curtos
  - **Botão fechar modal:** ícone `<X>` do lucide em badge `rgba(255,255,255,0.08)` 30x30 — nunca `✕` texto
  - **Toast/feedback:** ícones lucide (`CheckCircle2`/`XCircle`) — nunca emoji (`✅`/`❌`)
  - **Skeleton:** sempre com animação `shimmer` via keyframe injetado com `<style>` no topo do componente: `@keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }` + `animation:'shimmer 1.4s infinite linear'` e `backgroundSize:'200% 100%'`
  - **Empty state:** ícone lucide em `emptyIconWrap` (círculo 60x60 `#F5F5F5`), título + subtítulo cinza, CTA preto com ícone lucide
  - **KPI cards:** barra de progresso deve representar métrica real (nunca fórmula arbitrária tipo `total * 10`). Cores da barra em gradiente (`linear-gradient(90deg,#X,#Y)`) para visual mais refinado
  - **Avatar:** cor via mapa `{bg, text}` — nunca gambiarra de `.replace()` em hex
    ```js
    const CORES_AVATAR = [
      { bg: '#A8D5C2', text: '#3E7D63' },
      { bg: '#B5CFF5', text: '#3A5FA5' },
      { bg: '#F5D5A8', text: '#A57A3A' },
      { bg: '#D5B5F5', text: '#6B3FA5' },
      { bg: '#F5C4B5', text: '#A55A3A' },
    ];
    ```
  - **Paleta de cores comedida:** em cards/KPIs, preferir cinza neutro (`#F5F5F5` bg, `#666` ícone) para métricas secundárias. Cores vivas (mint, azul, vermelho) reservadas para métricas primárias ou estados de alerta real
  - **Query Supabase em componentes:** sempre filtrar por `clinica_id` quando disponível (`if (clinicaId) query = query.eq('clinica_id', clinicaId)`)

- **Datas em formato BR:** `toLocaleDateString('pt-BR')` para exibição
  - Storage: ISO (`YYYY-MM-DD`)
  - Exibição: `DD/MM/YYYY`

- **Status com badges coloridas:** `bg-*-50 text-*-700 border-*-200 rounded-full`
  - Confirmado: green
  - Pendente: yellow
  - Aprovado: green
  - Rascunho: blue
  - Cancelado: red

- **Modal pattern:** `position: 'fixed'`, `zIndex: 1000`, clique fora fecha
  - Overlay: `rgba(0,0,0,0.4)`
  - Modal: `maxWidth: 500px`, `borderRadius: 12px`

---

## Arquivos Chave

| Arquivo | Responsabilidade |
|---|---|
| `app/login/page.jsx` | Autenticação + seleção de perfil |
| `components/AuthGuard.jsx` | Bloqueio de rotas sem auth + RLS local |
| `components/Sidebar.jsx` | Menu dinâmico por role + logout |
| `components/UI.jsx` | Button, Badge, Card, PageHeader, KpiCard |
| `app/(app)/agenda/page.jsx` | Agenda com CRUD + calendário (Supabase) |
| `app/hooks/useAgendamento.ts` | Hook TypeScript para CRUD de agendamentos no Supabase |
| `lib/supabase-client.ts` | Cliente Supabase (anon key, uso no frontend) |
| `app/api/clinica/route.js` | GET/PATCH clínicas via service_role |
| `app/api/auth/login/route.js` | POST login — verifica senha bcrypt na tabela `usuarios` |
| `app/(app)/pacientes/page.jsx` | Pacientes com CRUD (Supabase) |
| `app/(app)/orcamento/page.jsx` | Orçamentos com cálculo + CRUD (localStorage) |
| `app/(app)/precos/page.jsx` | Procedimentos com CRUD (localStorage) |
| `.claude/memory/` | Documentação de contexto persistente |

---

## Checklist de Pull Request

- [ ] Código em português (variáveis, funções, comentários)
- [ ] localStorage implementado (load em useEffect, save em handlers)
- [ ] CRUD completo (CREATE/READ/UPDATE/DELETE) se nova tabela
- [ ] Modal/formulário com validação básica
- [ ] Inline styles apenas (sem Tailwind)
- [ ] Cores padronizadas usadas
- [ ] Datas em formato BR (exibição)
- [ ] Status com badges coloridas
- [ ] Responsivo (mobile + desktop)
- [ ] Sem console.log (remover antes do commit)
- [ ] Mensagens de confirmação para DELETE
- [ ] useState/useEffect implementados corretamente
