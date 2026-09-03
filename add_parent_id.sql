-- Este script agrega la columna parent_id a la tabla event_items
-- para permitir la funcionalidad de consolidación de ítems (ítems padre e hijos).

ALTER TABLE public.event_items 
ADD COLUMN parent_id UUID REFERENCES public.event_items(id) ON DELETE CASCADE;
