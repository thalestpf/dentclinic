# DentClinic — Sistema de Gestão Odontológica

Frontend completo em React para consultórios e clínicas dentárias.

## Estrutura do projeto

```
dentclinic/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx       # Menu lateral reutilizável
│   │   └── UI.jsx            # Componentes: Button, Badge, Card, KpiCard, etc.
│   ├── pages/
│   │   ├── Login.jsx         # Tela de login
│   │   ├── Dashboard.jsx     # Dashboard principal com KPIs e gráficos
│   │   ├── Agenda.jsx        # Calendário semanal de consultas
│   │   ├── Prontuario.jsx    # Ficha clínica e odontograma
│   │   ├── Financeiro.jsx    # Fluxo financeiro e transações
│   │   └── Estoque.jsx       # Controle de insumos e relatórios
│   ├── styles/
│   │   └── global.css        # Variáveis CSS e estilos globais
│   ├── App.jsx               # Roteamento principal
│   └── index.js              # Entrada da aplicação
├── package.json
└── README.md
```

## Módulos

| Página | Rota interna | Descrição |
|---|---|---|
| Login | — | Autenticação com validação e perfis |
| Dashboard | `dashboard` | KPIs, gráfico semanal, consultas do dia |
| Agenda | `agenda` | Calendário semanal + mini calendário |
| Prontuário | `prontuario` | Odontograma, plano de tratamento, evolução |
| Financeiro | `financeiro` | Transações, fluxo de caixa, procedimentos |
| Estoque | `estoque` | Insumos críticos + relatórios disponíveis |

## Como rodar

### Pré-requisitos
- Node.js 16 ou superior
- npm ou yarn

### Instalação

```bash
# 1. Entre na pasta do projeto
cd dentclinic

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm start
```

O app abrirá automaticamente em `http://localhost:3000`.

### Build para produção

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `build/`.

## Customização

### Cores
Edite as variáveis CSS em `src/styles/global.css`:

```css
:root {
  --color-accent: #A8D5C2;      /* Verde principal */
  --color-sidebar: #1A1A1A;     /* Cor da sidebar */
  --color-bg: #F7F5F2;          /* Fundo geral */
}
```

### Dados
Os dados mockados estão diretamente em cada página (`src/pages/*.jsx`).
Para conectar a uma API real, substitua os arrays de dados por chamadas `fetch` ou use uma biblioteca como Axios/React Query.

### Novo módulo
1. Crie `src/pages/NovoModulo.jsx`
2. Adicione a rota em `src/App.jsx`
3. Adicione o item no menu em `src/components/Sidebar.jsx`

## Tecnologias

- **React 18** — Interface
- **CSS-in-JS (inline styles)** — Estilização sem dependências extras
- **Google Fonts** — DM Serif Display + DM Sans

## Próximos passos sugeridos

- [ ] Conectar a uma API REST (Node.js/Django/Laravel)
- [ ] Adicionar React Router para URLs amigáveis
- [ ] Implementar autenticação JWT
- [ ] Adicionar tela de cadastro de pacientes
- [ ] Integrar Chart.js ou Recharts para gráficos avançados
- [ ] Adicionar notificações em tempo real (WebSocket)
- [ ] Implementar modo escuro
