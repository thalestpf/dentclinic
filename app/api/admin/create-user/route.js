import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request) {
  try {
    const { email, senha, nome, role, clinica_id } = await request.json();

    // ⚠️ Validação: apenas super_admin pode criar usuários
    const adminToken = request.headers.get('x-admin-token');
    const ADMIN_TOKEN = process.env.ADMIN_CREATE_USER_TOKEN || '';
    if (!ADMIN_TOKEN || adminToken !== ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Validar campos
    if (!email || !senha || !nome || !role) {
      return NextResponse.json(
        { error: 'Email, senha, nome e role obrigatórios' },
        { status: 400 }
      );
    }

    // Gerar hash bcrypt (mais seguro que SHA-256)
    const senhaBcrypt = await bcrypt.hash(senha, 10);

    // Inserir no Supabase
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert([
        {
          email,
          senha_hash: senhaBcrypt,
          nome,
          role,
          clinica_id: clinica_id || null,
          ativo: true,
        },
      ])
      .select();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao criar usuário: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: data[0],
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
