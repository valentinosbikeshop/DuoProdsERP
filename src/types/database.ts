export type OrganizationBankInfo = {
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  titular?: string;
  rut?: string;
  email?: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  legal_name: string | null;
  rut: string | null;
  subtitle: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url?: string | null;
  bank_info: OrganizationBankInfo | null;
  is_demo: boolean;
  is_active: boolean;
  max_demo_events: number;
  max_demo_costs: number;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  organization_id: string | null;
  is_super_admin?: boolean;
  full_name?: string | null;
  created_at: string;
};

export type MasterCost = {
  id: string;
  organization_id?: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  costo: number;
  valor_neto: number;
  valor_total: number;
  ganancia: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  is_demo_base?: boolean;
  created_at: string;
};

export type Event = {
  id: string;
  organization_id?: string;
  name: string;
  client_company: string | null;
  location: string | null;
  event_date: string | null;
  month: number | null;
  year: number | null;
  description: string | null;
  status: 'planning' | 'approved' | 'completed';
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  has_retail_sales?: boolean;
  is_demo_base?: boolean;
};

export type EventItem = {
  id: string;
  organization_id?: string;
  event_id: string;
  servicio: string;
  detalle: string | null;
  tipo_evento: string | null;
  cantidad: number;
  costo: number;
  ganancia: number;
  valor_neto: number;
  iva: number;
  valor_total: number;
  margen: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  factura_url?: string | null;
  approved: boolean;
  created_at: string;
  parent_id?: string | null;
  iva_incluido?: boolean;
  es_insumo?: boolean;
  source_item_id?: string | null;
  cantidad_original?: number | null;
  is_demo_base?: boolean;
};

// For Supabase client type safety
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'max_demo_events' | 'max_demo_costs'> & {
          id?: string;
          created_at?: string;
          max_demo_events?: number;
          max_demo_costs?: number;
        };
        Update: Partial<Omit<Organization, 'id'>>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
        Relationships: [];
      };
      master_costs: {
        Row: MasterCost;
        Insert: Omit<MasterCost, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<MasterCost, 'id'>>;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Event, 'id'>>;
        Relationships: [];
      };
      event_items: {
        Row: EventItem;
        Insert: Omit<EventItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<EventItem, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
