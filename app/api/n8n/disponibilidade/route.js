import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HORARIOS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function autorizado(request) {
  return request.headers.get('authorization') === `Bearer ${process.env.N8N_SECRET_KEY}`;
}

export async function GET(request) {
  if (!autorizado(request)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dias = parseInt(searchParams.get('dias') || '7');
  const clinicaId = searchParams.get('clinica_id');
  const dentistaNome = searchParams.get('dentista_nome') || null;

  const agora = new Date();
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);

  const resultado = [];

  for (let i = 0; i <= dias; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    // Pular domingos
    if (data.getDay() === 0) continue;

    const dataISO = data.toISOString().split('T')[0];
    const dataBR = `${String(data.getDate()).padStart(2,'0')}/${String(data.getMonth()+1).padStart(2,'0')}`;
    const diaSemana = DIAS_SEMANA[data.getDay()];

    // Para hoje, filtrar horários que já passaram (+ 30 min de antecedência)
    let horariosBase = HORARIOS;
    if (i === 0) {
      const minAtual = agora.getHours() * 60 + agora.getMinutes();
      horariosBase = HORARIOS.filter(h => {
        const [hh, mm] = h.split(':').map(Number);
        return (hh * 60 + mm) > minAtual + 30;
      });
    }

    // Buscar horários já ocupados
    let query = supabaseAdmin
      .from('agendamentos')
      .select('hora')
      .eq('data', dataISO)
      .in('status', ['confirmado', 'pendente']);

    if (clinicaId) query = query.eq('clinica_id', clinicaId);
    if (dentistaNome) query = query.eq('dentista_nome', dentistaNome);

    const { data: ocupados } = await query;
    const horasOcupadas = (ocupados || []).map(a => a.hora.substring(0, 5));
    const disponiveis = horariosBase.filter(h => !horasOcupadas.includes(h));

    if (disponiveis.length > 0) {
      resultado.push({ data: dataISO, data_br: dataBR, dia_semana: diaSemana, horarios: disponiveis });
    }
  }

  return NextResponse.json(resultado);
}
