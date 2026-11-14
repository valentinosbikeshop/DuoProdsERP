export const PLATFORM_NAME = 'KAIROS ERP';
export const SUPER_ADMIN_EMAIL = 'valentinosbikeshop@gmail.com';
export const DUO_ORG_SLUG = 'duo-producciones';
export const DEMO_ORG_SLUG = 'demo-sandbox';
export const DEMO_USER_EMAIL = 'demo@duoproducciones-erp.cl';

export const DEMO_MAX_EVENTS = 8;
export const DEMO_MAX_COSTS = 15;
export const DEMO_MAX_ITEMS = 120;
export const DEMO_RETENTION_HOURS = 24;

export const EVENT_STATUS_LABELS: Record<string, string> = {
  planning: 'En Planificación',
  approved: 'Aprobado',
  completed: 'Completado',
};

export const EVENT_STATUS_COLORS: Record<string, string> = {
  planning: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

export const COST_CATEGORIES: Record<string, string> = {
  'Solista': 'Música',
  'DUO': 'Música',
  'Trío': 'Música',
  'Cuarteto': 'Música',
  'Sexteto Fiamma': 'Música',
  'Orquesta Fiamma': 'Música',
  'Canciones especiales': 'Música',
  'Cuarteto de Cuerdas Gala': 'Música',
  'Banda Live Corporativa (6 músicos)': 'Música',
  'DJ & VJ Profesional': 'Música',
  'Amplificación GESTSER': 'Mobiliario',
  'Sillas DUO': 'Mobiliario',
  'Mobiliario Lounge VIP': 'Mobiliario',
  'Sonido Line Array (300 pax)': 'Mobiliario',
  'Iluminación Robótica & Pantalla LED': 'Mobiliario',
  'Fotografía': 'Audiovisual',
  'Cobertura Fotográfica + Reel 4K': 'Audiovisual',
  'Animador': 'Personal',
  'Animador Bilingüe Corporativo': 'Personal',
  'Promotor': 'Personal',
  'Pintacaritas': 'Personal',
  'Actores': 'Personal',
  'Maquillaje profesional': 'Personal',
  'Staff Anfitrionas & Acreditación': 'Personal',
};
