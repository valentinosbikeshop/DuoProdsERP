'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DemoBanner } from '@/components/layout/demo-banner';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/use-user';
import { DUO_ORG_SLUG } from '@/lib/constants';
import { Loader2, Eye, ArrowLeft, Shield } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [returningHome, setReturningHome] = useState(false);
  const { organization, loading, isAdmin, isSuperAdmin, isDemo } = useUser();

  const handleReturnHome = async () => {
    setReturningHome(true);
    try {
      const res = await fetch('/api/admin/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnHome: true }),
      });
      if (res.ok) {
        window.location.href = '/governance';
      } else {
        setReturningHome(false);
      }
    } catch {
      setReturningHome(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const orgName = organization?.name || 'DUO Producciones';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          isDemo={isDemo}
          organizationName={orgName}
          organizationLogoUrl={organization?.logo_url}
        />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="p-0 w-64 h-full bg-background border-r sm:w-64 fixed inset-y-0 left-0 z-50 shadow-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación del Dashboard</SheetTitle>
          </SheetHeader>
          <Sidebar
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            isDemo={isDemo}
            organizationName={orgName}
            organizationLogoUrl={organization?.logo_url}
          />
        </div>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {isDemo && <DemoBanner isSuperAdmin={isSuperAdmin} />}
        {isSuperAdmin && organization && !isDemo && organization.slug !== DUO_ORG_SLUG && (
          <div className="bg-slate-900 text-slate-100 border-b border-indigo-500/30 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500 text-white border-0 gap-1">
                <Eye className="h-3 w-3" />
                Modo Supervisión Super Admin
              </Badge>
              <span className="text-slate-300">
                Visualizando el entorno privado de <strong className="text-white">{organization.name}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/governance">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800">
                  <Shield className="h-3.5 w-3.5" />
                  Gobernanza
                </Button>
              </Link>
              <Button
                type="button"
                size="sm"
                disabled={returningHome}
                onClick={handleReturnHome}
                className="h-7 gap-1.5 text-xs bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold"
              >
                {returningHome ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowLeft className="h-3 w-3" />}
                Volver a DUO Producciones
              </Button>
            </div>
          </div>
        )}
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
