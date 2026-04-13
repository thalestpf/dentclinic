import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.geraresistemas.com.br';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '4ED029CCDA3D-47C1-B6CB-5BC267DCF3BF';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'clientes';

// GET /api/whatsapp?clinica_id=xxx — lista conversas
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

// POST /api/whatsapp — envia mensagem manual
export async function POST(request) {
  try {
    const { telefone, mensagem, clinica_id } = await request.json();
    if (!telefone || !mensagem) {
      return NextResponse.json({ error: 'telefone e mensagem obrigatórios' }, { status: 400 });
    }

    // Enviar via Evolution API
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
      body: JSON.stringify({ number: telefone, text: mensagem }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Erro ao enviar: ' + err }, { status: 502 });
    }

    // Registrar no histórico da sessão
    const { data: sessao } = await supabaseAdmin
      .from('sessoes_whatsapp')
      .select('dados')
      .eq('telefone', telefone)
      .eq('clinica_id', clinica_id)
      .maybeSingle();

    const histAnt = sessao?.dados?.historico || [];
    const novoHistorico = [
      ...histAnt.slice(-30),
      { role: 'assistant', content: `[Manual] ${mensagem}` },
    ];

    await supabaseAdmin
      .from('sessoes_whatsapp')
      .update({
        dados: { historico: novoHistorico },
        ultimo_texto: mensagem,
        ultimo_contato: new Date().toISOString(),
      })
      .eq('telefone', telefone)
      .eq('clinica_id', clinica_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/whatsapp — pausar ou retomar IA
export async function PATCH(request) {
  try {
    const { telefone, clinica_id, pausada } = await request.json();
    if (!telefone) return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('sessoes_whatsapp')
      .update({ pausada: !!pausada })
      .eq('telefone', telefone)
      .eq('clinica_id', clinica_id);

    if (error) throw error;
    return NextResponse.json({ ok: true, pausada: !!pausada });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
