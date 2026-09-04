-- Agregar columna es_insumo a event_items
ALTER TABLE public.event_items 
ADD COLUMN es_insumo BOOLEAN DEFAULT false;
