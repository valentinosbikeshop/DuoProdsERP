'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Sheet, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUser } from '@/hooks/use-user';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar isAdmin={isAdmin} />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="p-0 w-64 h-full bg-background border-r sm:w-64 fixed inset-y-0 left-0 z-50 shadow-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación del Dashboard</SheetTitle>
          </SheetHeader>
          <Sidebar isAdmin={isAdmin} />
        </div>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
