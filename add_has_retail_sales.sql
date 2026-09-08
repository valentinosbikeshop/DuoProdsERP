-- Script para habilitar la opción de venta al por menor (retail) en eventos
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS has_retail_sales BOOLEAN DEFAULT false;

-- Actualizar el evento existente de la Fonda / Bingo a true
UPDATE public.events 
SET has_retail_sales = true 
WHERE id = '02ac431f-b4e6-4454-a0c4-01780ae4180d' 
   OR name ILIKE '%fonda%' 
   OR name ILIKE '%bingo%';
