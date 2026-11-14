-- ============================================================================
-- KAIROS ERP — Migración Multi-Tenant + Sesión de Prueba (Sandbox)
-- Compatible 100% con DUO Producciones (preserva todos los datos existentes)
-- Ejecutar en el SQL Editor de Supabase (100% idempotente)
-- ============================================================================

-- 1. Tabla de Empresas / Organizaciones (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  legal_name TEXT,
  rut TEXT,
  subtitle TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  bank_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_demo_events INTEGER NOT NULL DEFAULT 8,
  max_demo_costs INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Seed idempotente de DUO Producciones y la Organización de Prueba (Demo)
INSERT INTO public.organizations (
  name, slug, invite_code, legal_name, rut, subtitle, location, contact_email, contact_phone, bank_info, is_demo, is_active
)
VALUES (
  'DUO Producciones',
  'duo-producciones',
  'DUO-PROD-2026',
  'DUO Producciones SpA',
  '78.252.253-1',
  'PRODUCCIÓN DE EVENTOS, EXPERIENCIAS MUSICALES & SERVICIOS TÉCNICOS',
  'Rancagua, Chile',
  'duoprods.empresa@gmail.com',
  '+56 9 8229 0332',
  '{
    "banco": "Banco de Chile",
    "tipo_cuenta": "Cuenta Corriente",
    "numero_cuenta": "00-202-19108-07",
    "titular": "DUO Producciones SpA",
    "rut": "78.252.253-1",
    "email": "kpunsin@gmail.com / duoprods.empresa@gmail.com"
  }'::jsonb,
  false,
  true
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.organizations (
  name, slug, invite_code, legal_name, rut, subtitle, location, contact_email, contact_phone, bank_info, is_demo, is_active, max_demo_events, max_demo_costs
)
VALUES (
  'Productora Horizonte (Demo)',
  'demo-sandbox',
  'DEMO-ERP-2026',
  'Productora Horizonte Eventos SpA (DEMO)',
  '76.890.123-4',
  'PRODUCCIÓN INTEGRAL DE EVENTOS CORPORATIVOS, BODAS & BANQUETERÍA',
  'Santiago / Viña del Mar, Chile',
  'contacto@productorahorizonte-demo.cl',
  '+56 9 9000 0000',
  '{
    "banco": "Banco Santander (Demo)",
    "tipo_cuenta": "Cuenta Corriente",
    "numero_cuenta": "00-000-12345-67",
    "titular": "Productora Horizonte Eventos SpA",
    "rut": "76.890.123-4",
    "email": "pagos@productorahorizonte-demo.cl"
  }'::jsonb,
  true,
  true,
  8,
  15
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Columnas faltantes y Multi-Tenant en tablas existentes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.master_costs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tipo_doc_costo TEXT DEFAULT 'factura',
  ADD COLUMN IF NOT EXISTS is_demo_base BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_retail_sales BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_demo_base BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.event_items
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_demo_base BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_incluido BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS es_insumo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_item_id UUID REFERENCES public.event_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cantidad_original NUMERIC NULL;

-- 4. Backfill de datos históricos hacia DUO Producciones (preservando todo intacto)
DO $$
DECLARE
  duo_org_id UUID;
BEGIN
  SELECT id INTO duo_org_id FROM public.organizations WHERE slug = 'duo-producciones' LIMIT 1;

  UPDATE public.profiles
  SET organization_id = duo_org_id,
      role = 'admin',
      status = 'active',
      is_super_admin = true
  WHERE email = 'valentinosbikeshop@gmail.com';

  UPDATE public.profiles
  SET organization_id = duo_org_id
  WHERE organization_id IS NULL AND email NOT IN ('demo@duoproducciones-erp.cl', 'demo@kairos-erp.cl');

  UPDATE public.master_costs
  SET organization_id = duo_org_id
  WHERE organization_id IS NULL;

  UPDATE public.events
  SET organization_id = duo_org_id
  WHERE organization_id IS NULL;

  UPDATE public.event_items ei
  SET organization_id = COALESCE(
    (SELECT e.organization_id FROM public.events e WHERE e.id = ei.event_id),
    duo_org_id
  )
  WHERE ei.organization_id IS NULL;
END $$;

ALTER TABLE public.master_costs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.events ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.event_items ALTER COLUMN organization_id SET NOT NULL;

-- 5. Índices B-Tree para rendimiento y aislamiento RLS
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_master_costs_org_id ON public.master_costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_org_status ON public.events(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_event_items_org_id ON public.event_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON public.event_items(event_id);

-- 6. Funciones Helper SECURITY DEFINER (evitan recursión RLS y validan tenant)
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_status()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
$$;

CREATE OR REPLACE FUNCTION public.is_my_org_demo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT o.is_demo
     FROM public.profiles p
     JOIN public.organizations o ON o.id = p.organization_id
     WHERE p.id = auth.uid()
     LIMIT 1),
    false
  );
$$;

-- 7. Triggers automáticos para estampado seguro de organization_id
CREATE OR REPLACE FUNCTION public.set_default_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_my_org_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_default_org_id ON public.events;
CREATE TRIGGER trg_events_default_org_id
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();

DROP TRIGGER IF EXISTS trg_master_costs_default_org_id ON public.master_costs;
CREATE TRIGGER trg_master_costs_default_org_id
  BEFORE INSERT ON public.master_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();

CREATE OR REPLACE FUNCTION public.sync_event_item_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.events
    WHERE id = NEW.event_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_items_sync_org_id ON public.event_items;
CREATE TRIGGER trg_event_items_sync_org_id
  BEFORE INSERT ON public.event_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_item_org_id();

-- 8. Trigger actualizado de registro de usuarios con soporte de Código de Empresa
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duo_org_id UUID;
  matched_org_id UUID;
  raw_invite_code TEXT;
BEGIN
  SELECT id INTO duo_org_id FROM public.organizations WHERE slug = 'duo-producciones' LIMIT 1;
  raw_invite_code := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')), '');

  IF NEW.email = 'valentinosbikeshop@gmail.com' THEN
    INSERT INTO public.profiles (id, email, role, status, organization_id, is_super_admin)
    VALUES (NEW.id, NEW.email, 'admin', 'active', duo_org_id, true)
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin', status = 'active', organization_id = duo_org_id, is_super_admin = true;
  ELSE
    IF raw_invite_code IS NOT NULL THEN
      SELECT id INTO matched_org_id
      FROM public.organizations
      WHERE UPPER(invite_code) = UPPER(raw_invite_code)
        AND is_demo = false
        AND is_active = true
      LIMIT 1;
    END IF;

    INSERT INTO public.profiles (id, email, role, status, organization_id, is_super_admin)
    VALUES (NEW.id, NEW.email, 'member', 'pending', matched_org_id, false)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Reemplazo completo de políticas RLS con aislamiento estricto por Empresa (Tenant)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('organizations', 'profiles', 'master_costs', 'events', 'event_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- organizations
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT USING (
    id = public.get_my_org_id() OR public.is_super_admin()
  );

CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE USING (
    public.is_super_admin() OR (
      id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
      AND is_demo = false
    )
  );

CREATE POLICY "organizations_delete" ON public.organizations
  FOR DELETE USING (public.is_super_admin() AND slug <> 'duo-producciones');

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
      AND NOT public.is_my_org_demo()
    )
  );

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
      AND NOT public.is_my_org_demo()
      AND is_super_admin = false
      AND id <> auth.uid()
    )
  );

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (
    public.is_super_admin() OR (
      organization_id = public.get_my_org_id()
      AND public.get_my_role() = 'admin'
      AND public.get_my_status() = 'active'
      AND NOT public.is_my_org_demo()
      AND is_super_admin = false
      AND id <> auth.uid()
    )
  );

-- master_costs
DROP POLICY IF EXISTS "master_costs_select" ON public.master_costs;
DROP POLICY IF EXISTS "master_costs_insert_admin" ON public.master_costs;
DROP POLICY IF EXISTS "master_costs_update_admin" ON public.master_costs;
DROP POLICY IF EXISTS "master_costs_delete_admin" ON public.master_costs;

CREATE POLICY "master_costs_select" ON public.master_costs
  FOR SELECT USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
  );

CREATE POLICY "master_costs_insert_admin" ON public.master_costs
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_status() = 'active'
    AND (
      NOT public.is_my_org_demo()
      OR (
        SELECT count(*) FROM public.master_costs mc
        WHERE mc.organization_id = public.get_my_org_id()
          AND mc.is_demo_base = false
      ) < COALESCE(
        (SELECT max_demo_costs FROM public.organizations WHERE id = public.get_my_org_id()),
        15
      )
    )
  );

CREATE POLICY "master_costs_update_admin" ON public.master_costs
  FOR UPDATE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_status() = 'active'
  );

CREATE POLICY "master_costs_delete_admin" ON public.master_costs
  FOR DELETE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_role() = 'admin'
    AND public.get_my_status() = 'active'
    AND (NOT is_demo_base OR public.is_super_admin())
  );

-- events
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_delete" ON public.events;

CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND (created_by = auth.uid() OR public.get_my_role() = 'admin')
  );

CREATE POLICY "events_insert" ON public.events
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND (
      NOT public.is_my_org_demo()
      OR (
        SELECT count(*) FROM public.events ev
        WHERE ev.organization_id = public.get_my_org_id()
          AND ev.is_demo_base = false
      ) < COALESCE(
        (SELECT max_demo_events FROM public.organizations WHERE id = public.get_my_org_id()),
        8
      )
    )
  );

CREATE POLICY "events_update" ON public.events
  FOR UPDATE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND (created_by = auth.uid() OR public.get_my_role() = 'admin')
  );

CREATE POLICY "events_delete" ON public.events
  FOR DELETE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND (created_by = auth.uid() OR public.get_my_role() = 'admin')
    AND (NOT is_demo_base OR public.is_super_admin())
  );

-- event_items
DROP POLICY IF EXISTS "event_items_select" ON public.event_items;
DROP POLICY IF EXISTS "event_items_insert" ON public.event_items;
DROP POLICY IF EXISTS "event_items_update" ON public.event_items;
DROP POLICY IF EXISTS "event_items_delete" ON public.event_items;

CREATE POLICY "event_items_select" ON public.event_items
  FOR SELECT USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_items.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.created_by = auth.uid() OR public.get_my_role() = 'admin')
    )
  );

CREATE POLICY "event_items_insert" ON public.event_items
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_items.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.created_by = auth.uid() OR public.get_my_role() = 'admin')
    )
    AND (
      NOT public.is_my_org_demo()
      OR (
        SELECT count(*) FROM public.event_items ei
        WHERE ei.organization_id = public.get_my_org_id()
          AND ei.is_demo_base = false
      ) < 120
    )
  );

CREATE POLICY "event_items_update" ON public.event_items
  FOR UPDATE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_items.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.created_by = auth.uid() OR public.get_my_role() = 'admin')
    )
  );

CREATE POLICY "event_items_delete" ON public.event_items
  FOR DELETE USING (
    organization_id = public.get_my_org_id()
    AND public.get_my_status() = 'active'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_items.event_id
        AND e.organization_id = public.get_my_org_id()
        AND (e.created_by = auth.uid() OR public.get_my_role() = 'admin')
    )
  );
