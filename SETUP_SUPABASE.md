# 🚀 Setup Supabase - DentClinic

## ⚠️ IMPORTANTE: Executar SQL no Supabase

Siga esses passos para configurar o banco de dados:

### **Passo 1: Acessar Supabase SQL Editor**

1. Abra https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor** (lado esquerdo)
4. Clique em **New Query**

### **Passo 2: Executar Migrations**

Copie e cole TODO o conteúdo do arquivo `supabase/migrations.sql` na janela de SQL Editor.

⚠️ **IMPORTANTE:** Execute tudo de uma vez (o arquivo inteiro).

### **Passo 3: Verificar Tabelas**

Após executar, você deve ver no **Table Editor** (lado esquerdo):

- ✅ clinicas
- ✅ usuarios
- ✅ dentistas
- ✅ pacientes
- ✅ agendamentos
- ✅ procedimentos
- ✅ orcamentos
- ✅ agendamentos_whatsapp
- ✅ integracao_whatsapp

### **Passo 4: Dados de Teste**

As credenciais de teste já foram inseridas:

```
EMAIL: super@dentclinic.com
SENHA: senha123
ROLE: super_admin
```

E os dentistas:
```
silva@senior.com / senha123 (Dr. Silva - Clínica Dental Senior)
maria@senior.com / senha123 (Dra. Maria - Clínica Dental Senior)
joao@sorriso.com / senha123 (Dr. João - Sorriso Perfeito)
```

### **Passo 5: Atualizar Senhas (PRODUÇÃO)**

⚠️ As senhas no migrations.sql são placeholders. Em produção:

1. Use bcrypt para hash
2. Não coloque senhas em plain text
3. Implemente recuperação de senha

## 🔒 Row Level Security (RLS)

O RLS está habilitado mas desativado por enquanto. Quando implementar, configure:

**Super Admin:** Acessa tudo
```sql
CREATE POLICY "super_admin_all"
ON clinicas
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'super_admin');
```

**Dentista/Secretária:** Acessa só sua clínica
```sql
CREATE POLICY "user_own_clinic"
ON pacientes
FOR ALL
TO authenticated
USING (clinica_id = auth.jwt() ->> 'clinica_id');
```

## 📦 .env.local

Verifique se `.env.local` tem:

```
NEXT_PUBLIC_SUPABASE_URL=https://ymgmxznnhplmjvkrbxrm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## ✅ Pronto!

Agora você pode:

1. Testar login com `super@dentclinic.com / senha123`
2. Ver dados no Supabase
3. Próximo: Refatorar Dashboard para ler do Supabase

## 🐛 Troubleshooting

**Erro "função uuid_generate_v4 não existe":**
→ Supabase já tem habilitado por padrão. Verifique extensões ativas.

**Erro "Foreign Key violado":**
→ Certifique-se de executar em ordem (clinicas antes de usuarios, etc)

**Senhas não funcionam:**
→ As senhas estão com hash simplificado. Use `senha123` com exatidão.

---

**Próxima etapa:** Implementar WhatsApp webhook simples 🤖
