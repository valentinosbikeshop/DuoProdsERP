import { LayoutDashboard, DollarSign, Calendar, BarChart3, Shield } from 'lucide-react';

export const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/costs', label: 'Tarifas', icon: DollarSign },
  { href: '/events', label: 'Eventos', icon: Calendar },
  { href: '/analytics', label: 'Analítica', icon: BarChart3 },
];

export const adminLinks = [
  { href: '/governance', label: 'Gobernanza', icon: Shield },
];
