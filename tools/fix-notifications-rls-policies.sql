-- Script para arreglar políticas RLS de notificaciones

-- 1. Verificar si RLS está habilitado en la tabla notifications
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

-- 2. Ver las políticas RLS existentes para notifications
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
WHERE tablename = 'notifications';

-- 3. Crear políticas para notificaciones
DO $$
BEGIN
    -- Política para INSERT: cualquier usuario autenticado puede crear notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Allow authenticated users to insert notifications'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert notifications" ON notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
        
        RAISE NOTICE 'Policy created: Allow authenticated users to insert notifications';
    ELSE
        RAISE NOTICE 'Policy already exists: Allow authenticated users to insert notifications';
    END IF;

    -- Política para SELECT: usuarios solo pueden ver sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications" ON notifications
        FOR SELECT
        TO authenticated
        USING (auth.uid()::text = "userId");
        
        RAISE NOTICE 'Policy created: Users can view their own notifications';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view their own notifications';
    END IF;

    -- Política para UPDATE: usuarios pueden marcar sus notificaciones como leídas
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can update their own notifications'
    ) THEN
        CREATE POLICY "Users can update their own notifications" ON notifications
        FOR UPDATE
        TO authenticated
        USING (auth.uid()::text = "userId")
        WITH CHECK (auth.uid()::text = "userId");
        
        RAISE NOTICE 'Policy created: Users can update their own notifications';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can update their own notifications';
    END IF;

    -- Política para DELETE: usuarios pueden eliminar sus propias notificaciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND policyname = 'Users can delete their own notifications'
    ) THEN
        CREATE POLICY "Users can delete their own notifications" ON notifications
        FOR DELETE
        TO authenticated
        USING (auth.uid()::text = "userId");
        
        RAISE NOTICE 'Policy created: Users can delete their own notifications';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can delete their own notifications';
    END IF;
END $$;

-- 4. Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- 5. Verificar el estado actual de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';
