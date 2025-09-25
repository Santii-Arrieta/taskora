-- Script para agregar la columna searchRadius a la tabla users

-- 1. Verificar si existe la columna searchRadius
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'searchRadius'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN "searchRadius" INTEGER DEFAULT 10;
        RAISE NOTICE 'Columna searchRadius agregada';
    ELSE
        RAISE NOTICE 'Columna searchRadius ya existe';
    END IF;
END $$;

-- 2. Actualizar usuarios existentes con valor por defecto
UPDATE public.users 
SET "searchRadius" = 10
WHERE "searchRadius" IS NULL;

-- 3. Verificar la estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name IN ('location', 'searchRadius')
ORDER BY ordinal_position;
