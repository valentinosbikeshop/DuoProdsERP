'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { DUO_ORG_SLUG } from '@/lib/constants';
import Link from 'next/link';
import { Menu, LogOut, User, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onToggleSidebar: () => void;
  onSignOut?: () => Promise<void> | void;
}

export function Header({ onToggleSidebar, onSignOut }: HeaderProps) {
  const { profile, authUser, organization, loading, isDemo, isSuperAdmin } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
        return;
      }
      if (isSuperAdmin && organization && organization.slug !== DUO_ORG_SLUG) {
        await fetch('/api/admin/switch-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnHome: true }),
        }).catch(() => {});
      }
      await supabase.auth.signOut();
      window.location.href = '/login';
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      <div className="flex items-center lg:hidden">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menú</span>
        </Button>
      </div>
      
      {/* Spacer for desktop since menu button is hidden */}
      <div className="hidden lg:block"></div>

      <div className="flex items-center gap-2 sm:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline-block text-sm max-w-[200px] truncate">
                {loading ? 'Cargando...' : (profile?.email || authUser?.email || 'Usuario')}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Mi Cuenta</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {loading ? 'Cargando...' : (profile?.email || authUser?.email || 'Usuario')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isDemo && (
              <Link href="/security">
                <DropdownMenuItem className="cursor-pointer">
                  <ShieldCheck className="mr-2 h-4 w-4 text-primary" />
                  <span>Seguridad y 2FA</span>
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{signingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={signingOut}
          onClick={handleSignOut}
          className="h-8 gap-1.5 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          title="Cerrar sesión actual"
        >
          {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </Button>
      </div>
    </header>
  );
}
