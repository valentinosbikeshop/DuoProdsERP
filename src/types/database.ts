export type Profile = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active';
  created_at: string;
};

export type MasterCost = {
  id: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  costo: number;
  valor_neto: number;
  valor_total: number;
  ganancia: number;
  tipo_doc_costo?: 'factura' | 'boleta';
  created_at: string;
};

export type Event = {
  id: string;
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
};

export type EventItem = {
  id: string;
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
};

// For Supabase client type safety
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      master_costs: {
        Row: MasterCost;
        Insert: Omit<MasterCost, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<MasterCost, 'id'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Event, 'id'>>;
      };
      event_items: {
        Row: EventItem;
        Insert: Omit<EventItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<EventItem, 'id'>>;
      };
    };
  };
};
