import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST — criar novo usuário
export async function POST(request) {
  try {
    const { email, senha, nome, perfil, clinica_id, permissoes } = await request.json();

    if (!email || !senha || !nome || !perfil) {
      return NextResponse.json({ error: 'Email, senha, nome e perfil são obrigatórios' }, { status: 400 });
    }

    // 1. Criar no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Upsert em user_roles (evita erro de chave duplicada)
    const roleMap = { 'Dentista': 'dentista', 'Recepção': 'secretaria', 'Admin': 'super_admin' };
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({
      id: userId,
      nome,
      email,
      role: roleMap[perfil] || 'secretaria',
      clinica_id: clinica_id || null,
      permissoes: permissoes || {},
    }, { onConflict: 'id' });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: roleError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: userId });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno: ' + e.message }, { status: 500 });
  }
}

// PUT — atualizar usuário (nome, perfil, permissões, senha opcional)
export async function PUT(request) {
  try {
    const { id, nome, perfil, permissoes, senha } = await request.json();

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    // Atualizar senha se fornecida
    if (senha && senha.length >= 6) {
      await supabaseAdmin.auth.admin.updateUserById(id, { password: senha });
    }

    // Atualizar user_roles
    const roleMap = { 'Dentista': 'dentista', 'Recepção': 'secretaria', 'Admin': 'super_admin' };
    const updates = {};
    if (nome) updates.nome = nome;
    if (perfil) updates.role = roleMap[perfil] || 'secretaria';
    if (permissoes !== undefined) updates.permissoes = permissoes;

    const { error } = await supabaseAdmin.from('user_roles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno: ' + e.message }, { status: 500 });
  }
}

// GET — listar usuários da clínica
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicaId = searchParams.get('clinica_id');

    let query = supabaseAdmin.from('user_roles').select('id, nome, email, role, permissoes, clinica_id').neq('role', 'super_admin').order('nome');
    if (clinicaId) query = query.eq('clinica_id', clinicaId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data || []);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — remover usuário
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    await supabaseAdmin.from('user_roles').delete().eq('id', id);
    await supabaseAdmin.auth.admin.deleteUser(id);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno: ' + e.message }, { status: 500 });
  }
}
