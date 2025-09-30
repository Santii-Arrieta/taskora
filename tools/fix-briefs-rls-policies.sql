-- Script para verificar y arreglar políticas RLS para briefs

-- 1. Verificar si RLS está habilitado en la tabla briefs
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'briefs';

-- 2. Ver las políticas RLS existentes para briefs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'briefs';

-- 3. Crear política para permitir que cualquier usuario autenticado pueda actualizar applications
-- (Solo si no existe ya)
DO $$
BEGIN
    -- Verificar si ya existe una política para actualizar applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'briefs' 
        AND policyname = 'Allow authenticated users to update applications'
    ) THEN
        -- Crear política para actualizar applications
        CREATE POLICY "Allow authenticated users to update applications" ON briefs
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE 'Policy created: Allow authenticated users to update applications';
    ELSE
        RAISE NOTICE 'Policy already exists: Allow authenticated users to update applications';
    END IF;
END $$;

-- 4. Verificar que la política se creó correctamente
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'briefs' 
AND policyname = 'Allow authenticated users to update applications';

-- 5. Alternativa: Deshabilitar RLS temporalmente para testing (NO RECOMENDADO EN PRODUCCIÓN)
-- ALTER TABLE briefs DISABLE ROW LEVEL SECURITY;

-- 6. Verificar el estado actual de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'briefs';
