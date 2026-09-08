-- Script para habilitar trazabilidad de insumos fraccionados o compras divididas
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.event_items 
ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES public.event_items(id) ON DELETE SET NULL;

ALTER TABLE public.event_items 
ADD COLUMN IF NOT EXISTS cantidad_original NUMERIC NULL;
