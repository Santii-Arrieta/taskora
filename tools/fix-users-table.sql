-- Script para verificar y arreglar la tabla users

-- 1. Verificar la estructura actual de la tabla users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Agregar columnas faltantes relacionadas con verificación
DO $$ 
BEGIN
    -- Verificar si existe la columna verificationStatus
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verificationStatus'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN verificationStatus TEXT DEFAULT 'unverified';
        RAISE NOTICE 'Columna verificationStatus agregada';
    ELSE
        RAISE NOTICE 'Columna verificationStatus ya existe';
    END IF;
    
    -- Verificar si existe la columna verificationDocs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verificationDocs'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN verificationDocs JSONB DEFAULT NULL;
        RAISE NOTICE 'Columna verificationDocs agregada';
    ELSE
        RAISE NOTICE 'Columna verificationDocs ya existe';
    END IF;
    
    -- Verificar si existe la columna verified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'verified'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Columna verified agregada';
    ELSE
        RAISE NOTICE 'Columna verified ya existe';
    END IF;
    
    -- Verificar si existe la columna updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Columna updated_at agregada';
    ELSE
        RAISE NOTICE 'Columna updated_at ya existe';
    END IF;
END $$;

-- 3. Actualizar valores por defecto para usuarios existentes
UPDATE public.users 
SET 
  "verificationStatus" = 'unverified',
  verified = FALSE
WHERE "verificationStatus" IS NULL OR verified IS NULL;

-- 4. Verificar la estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;
