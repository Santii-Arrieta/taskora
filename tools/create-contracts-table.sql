-- Script para verificar y crear la tabla contracts si no existe
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si la tabla contracts existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'contracts'
) as table_exists;

-- Si la tabla no existe, crearla
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

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_contracts_provider_id ON contracts("providerId");
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts("clientId");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts("createdAt");

-- Habilitar RLS (Row Level Security)
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY IF NOT EXISTS "Users can view their own contracts" ON contracts
    FOR SELECT USING (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

CREATE POLICY IF NOT EXISTS "Users can insert their own contracts" ON contracts
    FOR INSERT WITH CHECK (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

CREATE POLICY IF NOT EXISTS "Users can update their own contracts" ON contracts
    FOR UPDATE USING (
        "providerId" = auth.uid() OR 
        "clientId" = auth.uid()
    );

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;
