'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { ehModuloHabilitado } from '@/lib/planos-modulos';

// Mapeamento de rota -> id do módulo em PLANOS_MODULOS
const ROTA_MODULO = {
  '/dashboard': 'dashboard',
  '/agenda': 'agenda',
  '/pacientes': 'pacientes',
  '/whatsapp': 'whatsapp',
  '/prontuario': 'prontuario',
  '/orcamento': 'orcamento',
  '/financeiro': 'financeiro',
  '/estoque': 'estoque',
  '/relatorios': 'relatorios',
};

function obterPlanoClinica(clinicaId) {
  try {
    const clinicasPlanos = JSON.parse(localStorage.getItem('clinicas_planos') || '[]');
    const vinculo = clinicasPlanos.find(cp => cp.clinica_id === clinicaId && cp.ativo);
    return vinculo?.plano_nome || null;
  } catch {
    return null;
  }
}

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Checar autenticação ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Não autenticado - redirecionar para login
        router.replace('/login');
        return;
      }

      setSession(session);
      carregarDadosUsuario(session.user.id);
    });

    // Ouvir mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login');
        return;
      }

      setSession(session);
      carregarDadosUsuario(session.user.id);
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  const carregarDadosUsuario = async (userId) => {
    try {
      let data = null;
      let erro = null;

      const consultaPorId = await supabase
        .from('user_roles')
        .select('role, clinica_id')
        .eq('id', userId)
        .maybeSingle();

      data = consultaPorId.data;
      erro = consultaPorId.error;

      if (!data) {
        const consultaPorUserId = await supabase
          .from('user_roles')
          .select('role, clinica_id')
          .eq('user_id', userId)
          .maybeSingle();
        data = consultaPorUserId.data;
        erro = consultaPorUserId.error;
      }

      const userRole = data?.role || 'dentista';
      const clinicaId = data?.clinica_id || null;
      setRole(userRole);

      // Bloquear acesso ao super-admin para não super_admin
      if (pathname.startsWith('/super-admin') && userRole !== 'super_admin') {
        router.replace('/dashboard');
        return;
      }

      // Validar rotas restritas para secretária
      const restrictedForSecretaria = ['/prontuario', '/relatorios', '/configuracoes'];
      if (userRole === 'secretaria' && restrictedForSecretaria.some(route => pathname.startsWith(route))) {
        router.replace('/dashboard');
        return;
      }

      // Verificar restrição de plano (apenas para dentista e secretária)
      if (userRole !== 'super_admin' && clinicaId) {
        const rotaBase = '/' + pathname.split('/')[1];
        const moduloId = ROTA_MODULO[rotaBase];

        if (moduloId) {
          const planoClinica = obterPlanoClinica(clinicaId);
          if (planoClinica && !ehModuloHabilitado(planoClinica, moduloId)) {
            router.replace('/dashboard');
            return;
          }
        }
      }

      setReady(true);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setReady(true);
    }
  };

  if (!ready) {
    return null; // Aguardando autenticação
  }

  return children;
}
