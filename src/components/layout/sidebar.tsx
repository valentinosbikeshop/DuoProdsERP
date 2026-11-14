'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { KairosLogo, CompanyLogoMark } from '@/components/ui/kairos-logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { navLinks, adminLinks } from './nav-links';

interface SidebarProps {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  isDemo?: boolean;
  organizationName?: string;
  organizationLogoUrl?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export function Sidebar({
  isAdmin,
  isSuperAdmin = false,
  isDemo = false,
  organizationName = 'DUO Producciones',
  organizationLogoUrl,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();

  const visibleAdminLinks = adminLinks.filter((link) => {
    if (link.href === '/governance') {
      return isSuperAdmin || (!isDemo && isAdmin);
    }
    return true;
  });

  return (
    <aside className="w-64 fixed left-0 top-0 bottom-0 h-full border-r border-border/60 bg-card/90 backdrop-blur-xl flex flex-col z-50 shadow-xs">
      <div className="h-16 flex items-center px-4 border-b border-border/60 shrink-0 gap-2.5">
        <CompanyLogoMark
          name={organizationName}
          logoUrl={organizationLogoUrl}
          isDemo={isDemo}
          size="sm"
        />
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate" title={organizationName}>
            {organizationName}
          </span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0',
              isDemo
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-primary/10 text-primary border-primary/20'
            )}
          >
            {isDemo ? 'DEMO' : 'ERP'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {(isAdmin || isSuperAdmin) && visibleAdminLinks.length > 0 && (
          <div className="mt-8">
            <h4 className="px-7 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administración
            </h4>
            <nav className="px-4 space-y-1">
              {visibleAdminLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                const label =
                  link.href === '/governance'
                    ? isSuperAdmin
                      ? 'Gobernanza y Empresas'
                      : 'Equipo y Accesos'
                    : link.label;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t shrink-0 space-y-2.5 bg-muted/15">
        {userEmail && (
          <p className="text-[11px] text-muted-foreground truncate px-1" title={userEmail}>
            {userEmail}
          </p>
        )}
        {onSignOut && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="w-full justify-start gap-2 h-8 text-xs font-medium text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar Sesión
          </Button>
        )}
        <div className="flex items-center justify-center pt-1">
          <KairosLogo size="sm" subtitle="Multi-Tenant Cloud" />
        </div>
      </div>
    </aside>
  );
}
