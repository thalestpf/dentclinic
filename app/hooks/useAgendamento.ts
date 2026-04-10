'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';

interface DadosAgendamento {
  id?: string;
  pacienteNome: string;
  pacienteEmail?: string;
  pacienteTelefone?: string;
  pacienteCpf?: string;
  data: string;
  hora: string;
  procedimento: string;
  dentistaNome?: string;
  observacoes?: string;
  status?: string;
  color?: string;
}

interface ResultadoAgendamento {
  sucesso: boolean;
  mensagem: string;
  dados?: DadosAgendamento;
}

export function useAgendamento() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  // Obter clinica_id da sessão (fallback para localStorage)
  const obterClinicaId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data } = await supabase
          .from('user_roles')
          .select('clinica_id')
          .eq('user_id', session.user.id)
          .single();
        if (data?.clinica_id) return data.clinica_id;
      }
    } catch (err) {
      console.error('Erro ao obter clinica_id da sessão:', err);
    }
    return null;
  }, []);

  // Validar dados do agendamento
  const validarDados = useCallback((dados: DadosAgendamento): string | null => {
    if (!dados.pacienteNome?.trim()) return 'Nome do paciente é obrigatório';
    if (!dados.data?.trim()) return 'Data do agendamento é obrigatória';
    if (!dados.hora?.trim()) return 'Hora do agendamento é obrigatória';
    if (!dados.procedimento?.trim()) return 'Procedimento é obrigatório';

    // Validar formato de email se fornecido
    if (dados.pacienteEmail?.trim()) {
      const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regexEmail.test(dados.pacienteEmail)) {
        return 'Email inválido';
      }
    }

    // Validar formato de telefone se fornecido
    if (dados.pacienteTelefone?.trim()) {
      const telefoneLimpo = dados.pacienteTelefone.replace(/\D/g, '');
      if (telefoneLimpo.length < 10) {
        return 'Telefone deve ter pelo menos 10 dígitos';
      }
    }

    return null;
  }, []);

  // Criar novo agendamento
  const criarAgendamento = useCallback(
    async (dados: DadosAgendamento): Promise<ResultadoAgendamento> => {
      setCarregando(true);
      setErro(null);
      setSucesso(false);

      try {
        // 1. Validar dados
        const erroValidacao = validarDados(dados);
        if (erroValidacao) {
          setErro(erroValidacao);
          setCarregando(false);
          return {
            sucesso: false,
            mensagem: erroValidacao,
          };
        }

        // 2. Obter clinica_id
        const clinicaId = await obterClinicaId();

        // 3. Preparar dados para Supabase
        const dadosSupabase: any = {
          paciente_nome: dados.pacienteNome,
          paciente_email: dados.pacienteEmail || null,
          paciente_fone: dados.pacienteTelefone || null,
          paciente_cpf: dados.pacienteCpf || null,
          data: dados.data,
          hora: dados.hora,
          procedimento: dados.procedimento,
          dentista_nome: dados.dentistaNome || null,
          observacoes: dados.observacoes || null,
          status: dados.status || 'pendente',
          color: dados.color || 'green',
        };

        // Adicionar clinica_id só se existir
        if (clinicaId) {
          dadosSupabase.clinica_id = clinicaId;
        }

        // 4. Inserir no Supabase
        const { data: novoAgendamento, error: erroSupabase } = await supabase
          .from('agendamentos')
          .insert([dadosSupabase])
          .select()
          .single();

        if (erroSupabase) {
          const mensagem = erroSupabase.message || 'Erro ao criar agendamento';
          setErro(mensagem);
          setCarregando(false);
          return {
            sucesso: false,
            mensagem: mensagem,
          };
        }

        // Sucesso!
        setSucesso(true);
        setCarregando(false);

        return {
          sucesso: true,
          mensagem: 'Agendamento criado com sucesso',
          dados: {
            id: novoAgendamento.id,
            pacienteNome: novoAgendamento.paciente_nome,
            pacienteEmail: novoAgendamento.paciente_email,
            pacienteTelefone: novoAgendamento.paciente_fone,
            data: novoAgendamento.data,
            hora: novoAgendamento.hora,
            procedimento: novoAgendamento.procedimento,
            dentistaNome: novoAgendamento.dentista_nome,
            observacoes: novoAgendamento.observacoes,
            status: novoAgendamento.status,
            color: novoAgendamento.color,
          },
        };
      } catch (err) {
        const mensagemErro = err instanceof Error ? err.message : 'Erro desconhecido';
        setErro(mensagemErro);
        setCarregando(false);

        return {
          sucesso: false,
          mensagem: mensagemErro,
        };
      }
    },
    [validarDados, obterClinicaId]
  );

  // Atualizar agendamento
  const atualizarAgendamento = useCallback(
    async (id: string, dados: DadosAgendamento): Promise<ResultadoAgendamento> => {
      setCarregando(true);
      setErro(null);
      setSucesso(false);

      try {
        // 1. Validar dados
        const erroValidacao = validarDados(dados);
        if (erroValidacao) {
          setErro(erroValidacao);
          setCarregando(false);
          return {
            sucesso: false,
            mensagem: erroValidacao,
          };
        }

        // 2. Preparar dados para Supabase
        const dadosSupabase: any = {
          paciente_nome: dados.pacienteNome,
          paciente_email: dados.pacienteEmail || null,
          paciente_fone: dados.pacienteTelefone || null,
          paciente_cpf: dados.pacienteCpf || null,
          data: dados.data,
          hora: dados.hora,
          procedimento: dados.procedimento,
          dentista_nome: dados.dentistaNome || null,
          observacoes: dados.observacoes || null,
          status: dados.status || 'pendente',
          color: dados.color || 'green',
        };

        // 3. Atualizar no Supabase
        const { data: agendamentoAtualizado, error: erroSupabase } = await supabase
          .from('agendamentos')
          .update(dadosSupabase)
          .eq('id', id)
          .select()
          .single();

        if (erroSupabase) {
          const mensagem = erroSupabase.message || 'Erro ao atualizar agendamento';
          setErro(mensagem);
          setCarregando(false);
          return {
            sucesso: false,
            mensagem: mensagem,
          };
        }

        setSucesso(true);
        setCarregando(false);

        return {
          sucesso: true,
          mensagem: 'Agendamento atualizado com sucesso',
          dados: {
            id: agendamentoAtualizado.id,
            pacienteNome: agendamentoAtualizado.paciente_nome,
            pacienteEmail: agendamentoAtualizado.paciente_email,
            pacienteTelefone: agendamentoAtualizado.paciente_fone,
            data: agendamentoAtualizado.data,
            hora: agendamentoAtualizado.hora,
            procedimento: agendamentoAtualizado.procedimento,
            dentistaNome: agendamentoAtualizado.dentista_nome,
            observacoes: agendamentoAtualizado.observacoes,
            status: agendamentoAtualizado.status,
            color: agendamentoAtualizado.color,
          },
        };
      } catch (err) {
        const mensagemErro = err instanceof Error ? err.message : 'Erro desconhecido';
        setErro(mensagemErro);
        setCarregando(false);

        return {
          sucesso: false,
          mensagem: mensagemErro,
        };
      }
    },
    [validarDados]
  );

  // Deletar agendamento
  const deletarAgendamento = useCallback(
    async (id: string): Promise<ResultadoAgendamento> => {
      setCarregando(true);
      setErro(null);
      setSucesso(false);

      try {
        // 1. Deletar no Supabase
        const { error: erroSupabase } = await supabase
          .from('agendamentos')
          .delete()
          .eq('id', id);

        if (erroSupabase) {
          const mensagem = erroSupabase.message || 'Erro ao deletar agendamento';
          setErro(mensagem);
          setCarregando(false);
          return {
            sucesso: false,
            mensagem: mensagem,
          };
        }

        setSucesso(true);
        setCarregando(false);

        return {
          sucesso: true,
          mensagem: 'Agendamento deletado com sucesso',
        };
      } catch (err) {
        const mensagemErro = err instanceof Error ? err.message : 'Erro desconhecido';
        setErro(mensagemErro);
        setCarregando(false);

        return {
          sucesso: false,
          mensagem: mensagemErro,
        };
      }
    },
    []
  );

  // Obter agendamentos
  const obterAgendamentos = useCallback(async (): Promise<DadosAgendamento[]> => {
    try {
      // Obter clinica_id
      const clinicaId = await obterClinicaId();

      // Buscar do Supabase
      let query = supabase
        .from('agendamentos')
        .select('*')
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      // Se tem clinica_id, filtrar por ela
      if (clinicaId) {
        query = query.eq('clinica_id', clinicaId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao obter agendamentos:', error);
        return [];
      }

      // Mapear dados do Supabase para formato do hook
      return (data || []).map((agendamento: any) => ({
        id: agendamento.id,
        pacienteNome: agendamento.paciente_nome,
        pacienteEmail: agendamento.paciente_email,
        pacienteTelefone: agendamento.paciente_fone,
        pacienteCpf: agendamento.paciente_cpf,
        data: agendamento.data,
        hora: agendamento.hora,
        procedimento: agendamento.procedimento,
        dentistaNome: agendamento.dentista_nome,
        observacoes: agendamento.observacoes,
        status: agendamento.status,
        color: agendamento.color,
      }));
    } catch (err) {
      console.error('Erro ao obter agendamentos:', err);
      return [];
    }
  }, [obterClinicaId]);

  // Limpar mensagens
  const limparMensagens = useCallback(() => {
    setErro(null);
    setSucesso(false);
  }, []);

  return {
    criarAgendamento,
    atualizarAgendamento,
    deletarAgendamento,
    obterAgendamentos,
    limparMensagens,
    carregando,
    erro,
    sucesso,
  };
}
