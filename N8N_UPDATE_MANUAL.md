# Atualização Manual do Workflow n8n

**Workflow:** Atendimento clínica via WhatsApp  
**ID:** jACb0zILelzezeKZ  
**Tempo estimado:** 1 minuto

## Passo a Passo

1. Acesse: https://n8n.geraresistemas.com.br/
2. Clique no workflow **"Atendimento clínica via WhatsApp"**
3. Clique no nó **"Preparar Payload"** (lado esquerdo)
4. Na aba **Parameters**, encontre o campo **jsonOutput**
5. Use **Ctrl+F** para procurar por:

```
sugira EXATAMENTE 3 horários
```

6. **Delete** todo o texto de sugestão (linhas 96-98 aproximadamente):

```javascript
// DELETE ISTO:
c. Se NÃO DISPONÍVEL: diga apenas que esse horário não está disponível e 
sugira EXATAMENTE 3 horários que estejam na lista de HORÁRIOS LIVRES acima 
(nunca invente horários)
```

7. **Substitua por:**

```javascript
c. Se NÃO DISPONÍVEL: responda "Esse horário não está disponível. Qual outro você gostaria?"
```

8. **Procure por:**

```
- NUNCA sugerir horários alternativos
```

9. **Substitua por:**

```
- NUNCA sugerir ou listar horários — apenas pedir outro
```

10. Clique em **Save** (Ctrl+S)
11. Clique em **Publish** para ativar

## ✅ Resultado Esperado

Quando o paciente pedir um horário indisponível, a IA responderá:

```
Esse horário não está disponível. Qual outro você gostaria?
```

Ao invés de listar 3 alternativas.

## 🚀 Testar

Abra o WhatsApp e teste:
- "Quero agendar às 9:00" → IA verifica, se não estiver disponível, pede outro horário
- "Às 11:00?" → Se disponível, confirma. Se não, pede outro.

---

**Precisa de ajuda?** Use o chat do n8n ou me avise!
