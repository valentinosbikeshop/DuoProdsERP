-- 2. Table profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Table master_costs
CREATE TABLE public.master_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  servicio TEXT NOT NULL,
  tiempo_detalle TEXT NOT NULL,
  tipo_evento TEXT NOT NULL,
  costo NUMERIC NOT NULL,
  valor_neto NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  ganancia NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.master_costs ENABLE ROW LEVEL SECURITY;

-- 4. Table events
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_company TEXT,
  location TEXT,
  event_date DATE,
  month INTEGER,
  year INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'approved', 'completed')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 5. Table event_items
CREATE TABLE public.event_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  servicio TEXT NOT NULL,
  detalle TEXT,
  tipo_evento TEXT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  costo NUMERIC NOT NULL,
  ganancia NUMERIC NOT NULL,
  valor_neto NUMERIC NOT NULL,
  iva NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  margen NUMERIC NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;

-- 6. Trigger function handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'valentinosbikeshop@gmail.com' THEN
    INSERT INTO public.profiles (id, email, role, status)
    VALUES (NEW.id, NEW.email, 'admin', 'active');
  ELSE
    INSERT INTO public.profiles (id, email, role, status)
    VALUES (NEW.id, NEW.email, 'member', 'pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RLS Policies

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));

-- master_costs
CREATE POLICY "master_costs_select" ON public.master_costs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.status = 'active'));
CREATE POLICY "master_costs_insert_admin" ON public.master_costs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "master_costs_update_admin" ON public.master_costs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "master_costs_delete_admin" ON public.master_costs FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));

-- events
CREATE POLICY "events_select" ON public.events FOR SELECT USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.status = 'active'));
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));
CREATE POLICY "events_delete" ON public.events FOR DELETE USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.status = 'active'));

-- event_items
CREATE POLICY "event_items_select" ON public.event_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_items.event_id AND (e.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'))));
CREATE POLICY "event_items_insert" ON public.event_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_items.event_id AND (e.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'))));
CREATE POLICY "event_items_update" ON public.event_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_items.event_id AND (e.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'))));
CREATE POLICY "event_items_delete" ON public.event_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_items.event_id AND (e.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'active'))));

-- 8. Seed data for master_costs
INSERT INTO public.master_costs (servicio, tiempo_detalle, tipo_evento, costo, valor_neto, valor_total, ganancia) VALUES
('Solista', '60', 'Privado', 70000, 91000, 108290, 21000),
('Dúo', '60', 'Privado', 100000, 130000, 154700, 30000),
('Trío', '60', 'Privado', 150000, 195000, 232050, 45000),
('Cuarteto', '60', 'Privado', 200000, 260000, 309400, 60000),
('Sexteto Fiamma', '60', 'Privado', 691500, 898950, 1069751, 207450),
('Orquesta Fiamma', '60', 'Privado', 1383000, 1797900, 2139501, 414900),
('Amplificación GESTSER', '60', 'Privado', 50000, 65000, 77350, 15000),
('Animador', '240', 'Privado', 70000, 91000, 108290, 21000),
('Promotor', '60', 'Empresa', 50000, 65000, 77350, 15000),
('Pintacaritas', '180', 'Cumpleaños', 50000, 65000, 77350, 15000),
('Canciones especiales', '10', 'Privado', 10000, 13000, 15470, 3000),
('Actores', '60', 'Privado', 60000, 78000, 92820, 18000),
('Fotografía', '25 a 50 fotos', 'Empresa', 65000, 84500, 100555, 19500),
('Fotografía', '50 a 100 fotos', 'Empresa', 80000, 104000, 123760, 24000),
('Fotografía', '600 a 800 fotos desde ceremonia hasta el final', 'Matrimonio', 300000, 330000, 392700, 30000),
('Fotografía', '600 a 800 fotos desde preparación de los novios', 'Matrimonio', 350000, 455000, 541450, 105000),
('Maquillaje profesional', '1 persona', 'Empresa', 60000, 78000, 92820, 18000),
('Sillas DUO', '20 sillas negras altas para músicos', 'Empresa', 30000, 39000, 46410, 9000);
