-- Verificar se RLS está habilitado em clinicas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'clinicas';

-- Listar policies em clinicas
SELECT * FROM pg_policies
WHERE tablename = 'clinicas';
