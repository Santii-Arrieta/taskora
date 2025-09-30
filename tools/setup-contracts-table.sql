-- Script para crear la tabla contracts y funciones básicas
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear la tabla contracts si no existe
CREATE TABLE IF NOT EXISTS contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    "providerId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "providerName" TEXT,
    "clientName" TEXT,
    "providerAvatar" TEXT,
    "clientAvatar" TEXT,
    "completedByProvider" BOOLEAN DEFAULT FALSE,
    "completedByClient" BOOLEAN DEFAULT FALSE,
    "reviewByProvider" UUID,
    "reviewByClient" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_contracts_provider_id ON contracts("providerId");
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts("clientId");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts("createdAt");

-- 3. Habilitar RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
DROP POLICY IF EXISTS "Users can view their own contracts" ON contracts;
CREATE POLICY "Users can view their own contracts" ON contracts
    FOR SELECT USING (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

DROP POLICY IF EXISTS "Users can insert their own contracts" ON contracts;
CREATE POLICY "Users can insert their own contracts" ON contracts
    FOR INSERT WITH CHECK (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;
CREATE POLICY "Users can update their own contracts" ON contracts
    FOR UPDATE USING (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

-- 5. Verificar que la tabla existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'contracts'
) as table_exists;

-- 6. Mostrar estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;
