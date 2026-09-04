-- Agregar columna iva_incluido a event_items
ALTER TABLE public.event_items 
ADD COLUMN iva_incluido BOOLEAN DEFAULT true;
