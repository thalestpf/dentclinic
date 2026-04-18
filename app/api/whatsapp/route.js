import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.geraresistemas.com.br';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '4ED029CCDA3D-47C1-B6CB-5BC267DCF3BF';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'clientes';

function normalizarTelefone(telefone = '') {
  return String(telefone).replace('@s.whatsapp.net', '').replace(/\D/g, '');
}

function variantesTelefone(telefone = '') {
  const limpo = normalizarTelefone(telefone);
  if (!limpo) return [];
  return [limpo, `${limpo}@s.whatsapp.net`];
}

// GET /api/whatsapp?clinica_id=xxx - lista conversas
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clinicaId = searchParams.get('clinica_id');

  let query = supabaseAdmin
    .from('sessoes_whatsapp')
    .select('*')
    .order('ultimo_contato', { ascending: false, nullsFirst: false });

  if (clinicaId) query = query.eq('clinica_id', clinicaId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

// POST /api/whatsapp - envia mensagem manual
export async function POST(request) {
  try {
    const { telefone, mensagem, clinica_id, sessao_id } = await request.json();
    if (!telefone || !mensagem) {
      return NextResponse.json({ error: 'telefone e mensagem obrigatorios' }, { status: 400 });
    }

    const telefoneLimpo = normalizarTelefone(telefone);
    const telefonesPossiveis = variantesTelefone(telefone);

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: telefoneLimpo, text: mensagem }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Erro ao enviar: ' + err }, { status: 502 });
    }

    let querySessao = supabaseAdmin
      .from('sessoes_whatsapp')
      .select('id, dados')
      .limit(1);

    if (sessao_id) querySessao = querySessao.eq('id', sessao_id);
    else querySessao = querySessao.in('telefone', telefonesPossiveis);

    if (clinica_id) querySessao = querySessao.eq('clinica_id', clinica_id);

    const { data: sessao } = await querySessao.maybeSingle();

    const histAntigo = sessao?.dados?.historico || [];
    const novoHistorico = [
      ...histAntigo.slice(-30),
      { role: 'assistant', content: `[Manual] ${mensagem}`, timestamp: new Date().toISOString() },
    ];

    const dadosAtualizacao = {
      dados: { historico: novoHistorico },
      ultimo_texto: mensagem,
      ultimo_contato: new Date().toISOString(),
    };

    if (sessao?.id) {
      const { error } = await supabaseAdmin
        .from('sessoes_whatsapp')
        .update(dadosAtualizacao)
        .eq('id', sessao.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('sessoes_whatsapp')
        .upsert({
          telefone: telefoneLimpo,
          clinica_id: clinica_id || null,
          pausada: true,
          ...dadosAtualizacao,
        }, { onConflict: 'telefone,clinica_id' });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/whatsapp - pausar ou retomar IA
export async function PATCH(request) {
  try {
    const { telefone, clinica_id, pausada, sessao_id } = await request.json();
    if (!telefone && !sessao_id) {
      return NextResponse.json({ error: 'telefone ou sessao_id obrigatorio' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('sessoes_whatsapp')
      .update({ pausada: !!pausada });

    if (sessao_id) query = query.eq('id', sessao_id);
    else query = query.in('telefone', variantesTelefone(telefone));

    if (clinica_id) query = query.eq('clinica_id', clinica_id);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, pausada: !!pausada });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
