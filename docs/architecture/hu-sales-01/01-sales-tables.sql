-- ============================================================================
-- EAGLEGAMING POS / ERP - HABILITACIÓN DE VENTAS EN SUPABASE (HU-SALES-01)
-- Compatible con el esquema Prisma existente (sales y sale_items)
-- ============================================================================

BEGIN;

-- 1. Asegurar la creación de tablas si no existieran (con nombres exactos de Prisma)
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  folio TEXT NOT NULL UNIQUE,
  "cashierId" TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "shiftId" TEXT,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "amountPaid" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  change DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  "paymentMethod" TEXT NOT NULL DEFAULT 'EFECTIVO',
  status TEXT NOT NULL DEFAULT 'COMPLETADA',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id TEXT PRIMARY KEY,
  "saleId" TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  "unitPrice" DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- 2. Índices de rendimiento para el Dashboard
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sales_folio ON public.sales(folio);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items("saleId");
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items("productId");

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura de ventas a usuarios autenticados" ON public.sales;
CREATE POLICY "Permitir lectura de ventas a usuarios autenticados"
  ON public.sales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insercion de ventas a usuarios autenticados" ON public.sales;
CREATE POLICY "Permitir insercion de ventas a usuarios autenticados"
  ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de items a usuarios autenticados" ON public.sale_items;
CREATE POLICY "Permitir lectura de items a usuarios autenticados"
  ON public.sale_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir insercion de items a usuarios autenticados" ON public.sale_items;
CREATE POLICY "Permitir insercion de items a usuarios autenticados"
  ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Habilitar Realtime para que el Dashboard escuche cada venta en vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
  END IF;
END $$;

COMMIT;
