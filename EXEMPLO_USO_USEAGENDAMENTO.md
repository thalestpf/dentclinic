# Exemplo de Uso: useAgendamento Hook

## 📚 Como Usar o Hook na Página de Agenda

### Importar o Hook
```typescript
import { useAgendamento } from '@/app/hooks/useAgendamento';
```

### Usar no Componente
```typescript
'use client';

import { useState } from 'react';
import { useAgendamento } from '@/app/hooks/useAgendamento';
import { Button, Card, PageHeader } from '@/components/UI';

export default function AgendaPage() {
  const [formData, setFormData] = useState({
    pacienteNome: '',
    pacienteEmail: '',
    pacienteTelefone: '',
    data: '',
    hora: '',
    procedimento: '',
    dentistaNome: '',
    observacoes: '',
  });

  // ✅ Usar o hook
  const {
    criarAgendamento,
    atualizarAgendamento,
    deletarAgendamento,
    obterAgendamentos,
    carregando,
    erro,
    sucesso,
    limparMensagens,
  } = useAgendamento();

  // Exemplos de Uso:

  // ✅ 1. CRIAR novo agendamento
  const handleCriarAgendamento = async () => {
    const resultado = await criarAgendamento(formData);
    
    if (resultado.sucesso) {
      alert(resultado.mensagem); // "Agendamento criado com sucesso"
      setFormData({ pacienteNome: '', pacienteEmail: '', ... }); // Limpar form
    } else {
      alert(resultado.mensagem); // "Email inválido" ou outro erro
    }
  };

  // ✅ 2. ATUALIZAR agendamento existente
  const handleAtualizarAgendamento = async (id: string) => {
    const resultado = await atualizarAgendamento(id, formData);
    
    if (resultado.sucesso) {
      alert('Agendamento atualizado!');
    }
  };

  // ✅ 3. DELETAR agendamento
  const handleDeletarAgendamento = async (id: string) => {
    if (confirm('Tem certeza que quer deletar este agendamento?')) {
      const resultado = await deletarAgendamento(id);
      
      if (resultado.sucesso) {
        alert('Agendamento deletado');
        // Atualizar lista
      }
    }
  };

  // ✅ 4. OBTER todos os agendamentos
  const agendamentos = obterAgendamentos();

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Agenda" />

      {/* ✅ Mostrar mensagens */}
      {erro && <div style={{ color: 'red', padding: 10, marginBottom: 10 }}>❌ {erro}</div>}
      {sucesso && <div style={{ color: 'green', padding: 10, marginBottom: 10 }}>✅ Sucesso!</div>}

      {/* Formulário */}
      <Card style={{ marginBottom: 20, padding: 20 }}>
        <h3>Novo Agendamento</h3>

        <input
          type="text"
          placeholder="Nome do paciente"
          value={formData.pacienteNome}
          onChange={(e) => setFormData({ ...formData, pacienteNome: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.pacienteEmail}
          onChange={(e) => setFormData({ ...formData, pacienteEmail: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="tel"
          placeholder="Telefone"
          value={formData.pacienteTelefone}
          onChange={(e) => setFormData({ ...formData, pacienteTelefone: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="date"
          value={formData.data}
          onChange={(e) => setFormData({ ...formData, data: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="time"
          value={formData.hora}
          onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="text"
          placeholder="Procedimento"
          value={formData.procedimento}
          onChange={(e) => setFormData({ ...formData, procedimento: e.target.value })}
          style={{ width: '100%', marginBottom: 10, padding: 8 }}
        />

        <input
          type="text"
          placeholder="Dentista"
          value={formData.dentistaNome}
          onChange={(e) => setFormData({ ...formData, dentistaNome: e.target.value })}
          style={{ width: '100%', marginBottom: 20, padding: 8 }}
        />

        <Button
          onClick={handleCriarAgendamento}
          disabled={carregando}
          style={{ background: carregando ? '#ccc' : '#A8D5C2' }}
        >
          {carregando ? 'Salvando...' : 'Salvar Agendamento'}
        </Button>
      </Card>

      {/* Lista de Agendamentos */}
      <Card style={{ padding: 20 }}>
        <h3>Agendamentos</h3>
        {agendamentos.length === 0 ? (
          <p>Nenhum agendamento</p>
        ) : (
          <ul>
            {agendamentos.map((agendamento) => (
              <li key={agendamento.id} style={{ marginBottom: 10, padding: 10, border: '1px solid #ddd' }}>
                <strong>{agendamento.pacienteNome}</strong> - {agendamento.data} às {agendamento.hora}
                <br />
                {agendamento.procedimento} com {agendamento.dentistaNome}
                <div style={{ marginTop: 10 }}>
                  <Button
                    onClick={() => {
                      setFormData(agendamento);
                      // Scroll para o formulário
                    }}
                    style={{ marginRight: 10, background: '#F0AD4E' }}
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDeletarAgendamento(agendamento.id!)}
                    style={{ background: '#DC3545' }}
                  >
                    Deletar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
```

---

## 🔄 Fluxo Completo

### 1️⃣ **Usuário cria um agendamento:**
```
Form preenchido → Click "Salvar" → criarAgendamento() 
  ↓
[Validar dados]
  ↓ OK
[Salvar no localStorage] ← Sempre funciona
  ↓
[Enviar para n8n webhook] ← Automações (WhatsApp, Email)
  ↓
✅ Sucesso! (mesmo que n8n falhe)
```

### 2️⃣ **Se houver erro:**
```
Erro de validação → Mostrar mensagem de erro
Erro no localStorage → Falhar com mensagem
Erro no n8n → Salvar localmente + aviso (não falha)
```

### 3️⃣ **Estados disponíveis:**
```typescript
carregando → true enquanto processa, false quando termina
erro → null se OK, string com mensagem se erro
sucesso → true se OK, false se erro
```

---

## 📝 Função do Hook

| Método | O que faz | Retorna |
|--------|-----------|---------|
| `criarAgendamento(dados)` | Cria novo agendamento | `{ sucesso, mensagem, dados }` |
| `atualizarAgendamento(id, dados)` | Edita agendamento | `{ sucesso, mensagem, dados }` |
| `deletarAgendamento(id)` | Remove agendamento | `{ sucesso, mensagem }` |
| `obterAgendamentos()` | Lista todos | `Array<DadosAgendamento>` |
| `limparMensagens()` | Limpa erro/sucesso | `void` |

---

## ✅ Validações Automáticas

O hook valida automaticamente:
- ✅ Nome do paciente (obrigatório)
- ✅ Email do paciente (formato válido)
- ✅ Telefone (mínimo 10 dígitos)
- ✅ Data (obrigatória)
- ✅ Hora (obrigatória)
- ✅ Procedimento (obrigatório)

Se falhar em qualquer validação, retorna erro com mensagem clara.

---

## 🔐 Segurança

- Dados salvos em localStorage (cliente)
- Não há chamadas diretas à API
- Tudo passa pelo webhook do n8n
- Token de autenticação enviado junto

---

## 📦 Ambiente (.env.local)

```env
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.geraresistemas.com.br/webhook/agendamento
NEXT_PUBLIC_N8N_API_KEY=n8n_3119cdbef7a1195839f08eec286ad79d6d63d6bb14c81cc4
```

Se não estiver configurado, o hook apenas salva no localStorage (funciona assim mesmo).

---

## 🚀 Próximos Passos

1. Copie o exemplo acima para `/app/(app)/agenda/page.jsx`
2. Ajuste conforme necessário
3. Teste criar/editar/deletar agendamentos
4. Verifique se os dados chegam no n8n
