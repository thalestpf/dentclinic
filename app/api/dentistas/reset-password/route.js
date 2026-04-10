import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, novaSenha } = await request.json();

    if (!email || !novaSenha) {
      return Response.json(
        { error: 'Email e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Usar service role key para ter permissão de admin
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar usuário pelo email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers();

    if (searchError) {
      console.error('Erro ao buscar usuários:', searchError);
      return Response.json(
        { error: 'Erro ao buscar usuário: ' + searchError.message },
        { status: 400 }
      );
    }

    let user = users.users.find(u => u.email === email);
    let userId;

    if (user) {
      // Usuário existe - atualizar senha
      userId = user.id;
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: novaSenha,
      });

      if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
        return Response.json(
          { error: updateError.message },
          { status: 400 }
        );
      }

      return Response.json({
        success: true,
        message: 'Senha atualizada com sucesso',
      });
    } else {
      // Usuário não existe - criar novo
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: novaSenha,
        email_confirm: true,
      });

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        return Response.json(
          { error: createError.message },
          { status: 400 }
        );
      }

      return Response.json({
        success: true,
        message: 'Usuário criado com sucesso no Auth',
        userId: newUser.user.id,
      });
    }
  } catch (error) {
    console.error('Erro na API:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
