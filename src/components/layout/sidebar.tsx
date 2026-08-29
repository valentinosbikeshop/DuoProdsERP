'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';
import { navLinks, adminLinks } from './nav-links';

interface SidebarProps {
  isAdmin: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 fixed left-0 top-0 bottom-0 h-full border-r bg-card flex flex-col z-50">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <Music className="h-6 w-6 text-primary mr-2" />
        <span className="font-semibold text-lg flex items-center gap-2">
          Dúo Producciones
          <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">ERP</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        
        {isAdmin && (
          <div className="mt-8">
            <h4 className="px-7 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administración
            </h4>
            <nav className="px-4 space-y-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
      <div className="p-4 border-t shrink-0">
        <p className="text-xs text-muted-foreground text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
