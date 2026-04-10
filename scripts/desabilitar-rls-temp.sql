-- Desabilitar RLS temporariamente para teste
ALTER TABLE clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE dentistas DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('clinicas', 'dentistas', 'pacientes', 'agendamentos');
