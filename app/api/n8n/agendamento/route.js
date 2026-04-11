import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

export async function POST(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { paciente_nome, paciente_fone, data, hora, clinica_id } = body;

    if (!paciente_nome || !data || !hora) {
      return NextResponse.json({ error: 'Campos obrigatórios: paciente_nome, data, hora' }, { status: 400 });
    }

    // Verificar se horário ainda está disponível
    const { data: conflito } = await supabaseAdmin
      .from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('hora', hora.length === 5 ? hora + ':00' : hora)
      .in('status', ['confirmado', 'pendente'])
      .maybeSingle();

    if (conflito) {
      return NextResponse.json({ error: 'Horário indisponível', disponivel: false }, { status: 409 });
    }

    // Montar observações com dados extras do WhatsApp
    const partes = ['Agendado via WhatsApp'];
    if (body.forma_pagamento) partes.push(`Pagamento: ${body.forma_pagamento}`);
    if (body.convenio) partes.push(`Convênio: ${body.convenio}`);
    const observacoes = partes.join(' | ');

    const { data: agendamento, error } = await supabaseAdmin
      .from('agendamentos')
      .insert([{
        paciente_nome,
        paciente_fone: paciente_fone || '',
        paciente_cpf: body.paciente_cpf || null,
        paciente_email: body.paciente_email || null,
        data,
        hora: hora.length === 5 ? hora + ':00' : hora,
        procedimento: body.procedimento || 'Consulta',
        dentista_nome: body.dentista_nome || '',
        dentista_id: body.dentista_id || null,
        clinica_id: clinica_id || null,
        status: 'pendente',
        observacoes,
        color: 'green',
        origem: 'whatsapp',
      }])
      .select()
      .single();

    if (error) throw error;

    // Pré-cadastro do paciente (se não existir pelo CPF ou telefone)
    if (clinica_id) {
      const telefoneLimpo = (paciente_fone || '').replace(/\D/g, '');
      const cpfLimpo = (body.paciente_cpf || '').replace(/\D/g, '');

      // Verificar se já existe por CPF ou telefone
      let pacienteExiste = false;
      if (cpfLimpo) {
        const { data: porCpf } = await supabaseAdmin
          .from('pacientes')
          .select('id')
          .eq('clinica_id', clinica_id)
          .eq('cpf', cpfLimpo)
          .maybeSingle();
        if (porCpf) pacienteExiste = true;
      }
      if (!pacienteExiste && telefoneLimpo) {
        const { data: porTel } = await supabaseAdmin
          .from('pacientes')
          .select('id')
          .eq('clinica_id', clinica_id)
          .eq('telefone', telefoneLimpo)
          .maybeSingle();
        if (porTel) pacienteExiste = true;
      }

      // Criar pré-cadastro se não existe
      if (!pacienteExiste) {
        const dadosPaciente = {
          nome: paciente_nome,
          cpf: cpfLimpo || null,
          telefone: telefoneLimpo || null,
          email: body.paciente_email || null,
          nascimento: body.paciente_nascimento || null,
          endereco: body.paciente_endereco || null,
          convenio: body.convenio || null,
          clinica_id,
          status: 'ativo',
          origem: 'whatsapp',
          observacoes: `Pré-cadastro via WhatsApp | Pagamento: ${body.forma_pagamento || 'não informado'}`,
        };

        await supabaseAdmin.from('pacientes').insert([dadosPaciente]);
      }
    }

    return NextResponse.json({ ok: true, agendamento });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/n8n/agendamento — atualiza status de um agendamento
// Body: { id, status } ou { telefone, data, status }
export async function PATCH(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, telefone, data, status } = body;

    if (!status) {
      return NextResponse.json({ error: 'status obrigatório' }, { status: 400 });
    }

    let query = supabaseAdmin.from('agendamentos').update({ status }).select().single();

    if (id) {
      // Atualizar por ID direto
      query = supabaseAdmin.from('agendamentos').update({ status }).eq('id', id).select().single();
    } else if (telefone && data) {
      // Atualizar por telefone + data (para confirmação via WhatsApp)
      const telLimpo = telefone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
      query = supabaseAdmin.from('agendamentos')
        .update({ status })
        .eq('data', data)
        .in('status', ['pendente'])
        .ilike('paciente_fone', `%${telLimpo.slice(-10)}%`)
        .select();
    } else {
      return NextResponse.json({ error: 'id ou (telefone + data) obrigatórios' }, { status: 400 });
    }

    const { data: resultado, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, atualizado: resultado });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
