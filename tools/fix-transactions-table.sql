-- Script para mejorar la tabla de transacciones y prevenir duplicados

-- 1. PRIMERO: Eliminar transacciones duplicadas manteniendo solo la más reciente
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY mp_payment_id 
      ORDER BY date DESC
    ) as rn
  FROM public.transactions 
  WHERE mp_payment_id IS NOT NULL
)
DELETE FROM public.transactions 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. AHORA: Agregar índice único para prevenir transacciones duplicadas con el mismo mp_payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_mp_payment 
ON public.transactions (mp_payment_id) 
WHERE mp_payment_id IS NOT NULL;

-- 3. Agregar índice para mejorar performance en consultas por usuario
CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
ON public.transactions ("userId");

-- 4. Agregar índice para mejorar performance en consultas por fecha
CREATE INDEX IF NOT EXISTS idx_transactions_date 
ON public.transactions (date);

-- 5. Verificar que la tabla tenga todas las columnas necesarias
DO $$ 
BEGIN
    -- Verificar si existe la columna mp_payment_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'mp_payment_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.transactions 
        ADD COLUMN mp_payment_id TEXT;
    END IF;
    
    -- Verificar si existe la columna status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.transactions 
        ADD COLUMN status TEXT;
    END IF;
END $$;

-- 6. Crear política RLS para transacciones (si no existe)
DO $$ 
BEGIN
    -- Política para SELECT: usuarios pueden ver sus propias transacciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can view own transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" 
        ON public.transactions FOR SELECT 
        TO authenticated 
        USING (auth.uid() = "userId");
    END IF;
    
    -- Política para INSERT: usuarios pueden crear transacciones para sí mismos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can insert own transactions'
    ) THEN
        CREATE POLICY "Users can insert own transactions" 
        ON public.transactions FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = "userId");
    END IF;
    
    -- Política para UPDATE: usuarios pueden actualizar sus propias transacciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can update own transactions'
    ) THEN
        CREATE POLICY "Users can update own transactions" 
        ON public.transactions FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = "userId");
    END IF;
    
    -- Política para DELETE: usuarios pueden eliminar sus propias transacciones
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can delete own transactions'
    ) THEN
        CREATE POLICY "Users can delete own transactions" 
        ON public.transactions FOR DELETE 
        TO authenticated 
        USING (auth.uid() = "userId");
    END IF;
END $$;

-- 7. Habilitar RLS en la tabla transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 8. Comentarios para documentar la tabla
COMMENT ON TABLE public.transactions IS 'Tabla de transacciones financieras de usuarios';
COMMENT ON COLUMN public.transactions."userId" IS 'ID del usuario propietario de la transacción';
COMMENT ON COLUMN public.transactions.amount IS 'Monto de la transacción (positivo para depósitos, negativo para retiros)';
COMMENT ON COLUMN public.transactions.type IS 'Tipo de transacción: deposit, withdrawal, etc.';
COMMENT ON COLUMN public.transactions.description IS 'Descripción de la transacción';
COMMENT ON COLUMN public.transactions.date IS 'Fecha y hora de la transacción';
COMMENT ON COLUMN public.transactions.mp_payment_id IS 'ID único del pago de Mercado Pago (previene duplicados)';
COMMENT ON COLUMN public.transactions.status IS 'Estado del pago: approved, pending, rejected, etc.';
