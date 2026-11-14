'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Loader2,
  Building2,
  Users,
  Plus,
  Copy,
  Check,
  RotateCcw,
  UserCheck,
  UserX,
  Trash2,
  KeyRound,
  Lock,
  Sparkles,
  Power,
  Paintbrush,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { Organization, Profile } from '@/types';
import { CompanyLogoMark } from '@/components/ui/kairos-logo';
import { CompanyBrandingDialog, LogoUploadField } from '@/components/governance/company-branding-dialog';
import { MfaSettingsCard } from '@/components/auth/mfa-settings-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DUO_ORG_SLUG } from '@/lib/constants';

interface CompanyRow extends Organization {
  users_count: number;
  events_count: number;
}

interface UserRow extends Profile {
  organizations?: {
    id: string;
    name: string;
    slug: string;
    is_demo: boolean;
  } | null;
}

export default function GovernancePage() {
  const { profile, organization, loading: userLoading, isAdmin, isSuperAdmin, isDemo } = useUser();

  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pending user assignment state: { [userId]: { organization_id, role } }
  const [pendingOrgChoice, setPendingOrgChoice] = useState<Record<string, string>>({});
  const [pendingRoleChoice, setPendingRoleChoice] = useState<Record<string, 'member' | 'admin'>>({});

  // Create company & branding dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [brandingTarget, setBrandingTarget] = useState<Organization | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    legal_name: '',
    rut: '',
    location: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
    invite_code: '',
    seedStarterCatalog: true,
    adminEmail: '',
    adminPassword: '',
  });

  const canAccess = !userLoading && (isSuperAdmin || (!isDemo && isAdmin));

  const fetchGovernanceData = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const requests: Promise<Response>[] = [fetch('/api/admin/users')];
      if (isSuperAdmin) {
        requests.push(fetch('/api/admin/companies'));
      }

      const [usersRes, companiesRes] = await Promise.all(requests);
      const usersJson = await usersRes.json();

      if (usersRes.ok) {
        const fetchedUsers: UserRow[] = usersJson.users || [];
        setUsers(fetchedUsers);

        // Initialize pending selectors
        const orgDefaults: Record<string, string> = {};
        const roleDefaults: Record<string, 'member' | 'admin'> = {};
        fetchedUsers.forEach((u) => {
          orgDefaults[u.id] = u.organization_id || organization?.id || '';
          roleDefaults[u.id] = u.role || 'member';
        });
        setPendingOrgChoice(orgDefaults);
        setPendingRoleChoice(roleDefaults);
      }

      if (companiesRes) {
        const companiesJson = await companiesRes.json();
        if (companiesRes.ok) {
          setCompanies(companiesJson.companies || []);
        }
      }
    } catch (err) {
      console.error('Error fetching governance data:', err);
      setFeedback({ type: 'error', message: 'Error al cargar los datos de gobernanza.' });
    } finally {
      setLoading(false);
    }
  }, [canAccess, isSuperAdmin, organization?.id]);

  useEffect(() => {
    if (!userLoading) {
      fetchGovernanceData();
    }
  }, [userLoading, fetchGovernanceData]);

  const handleCopyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      alert(`Código de invitación: ${code}`);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo crear la empresa.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: data.warning ? `${data.message} (${data.warning})` : data.message,
      });
      setCreateOpen(false);
      setFormState({
        name: '',
        legal_name: '',
        rut: '',
        location: '',
        contact_email: '',
        contact_phone: '',
        logo_url: '',
        invite_code: '',
        seedStarterCatalog: true,
        adminEmail: '',
        adminPassword: '',
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al crear la empresa.' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCompanyActive = async (company: CompanyRow) => {
    const actionLabel = company.is_active ? 'suspender' : 'reactivar';
    if (!confirm(`¿Deseas ${actionLabel} el acceso a "${company.name}"?`)) return;

    setActionLoadingId(company.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: company.id, is_active: !company.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo actualizar la empresa.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: `Empresa "${company.name}" ${!company.is_active ? 'reactivada' : 'suspendida'}.`,
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al actualizar la empresa.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetDemoSandbox = async () => {
    if (
      !confirm(
        '¿Resetear ahora la Sesión de Prueba?\nSe eliminarán los registros creados por visitantes externos y se restaurarán los ejemplos base intactos.'
      )
    ) {
      return;
    }

    setActionLoadingId('reset-demo');
    setFeedback(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo resetear el sandbox.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: 'Sesión de Prueba reseteada y restaurada a su estado base.',
      });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al resetear la demo.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchCompany = async (targetOrgId: string) => {
    setActionLoadingId(`switch-${targetOrgId}`);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo cambiar de empresa.' });
        setActionLoadingId(null);
        return;
      }
      window.location.href = '/';
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al cambiar de entorno.' });
      setActionLoadingId(null);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    payload: { status?: 'pending' | 'active'; role?: 'admin' | 'member'; organization_id?: string }
  ) => {
    setActionLoadingId(userId);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo actualizar el usuario.' });
        return;
      }
      setFeedback({ type: 'success', message: 'Permisos de usuario actualizados.' });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al actualizar el usuario.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userRow: UserRow) => {
    if (!confirm(`¿Eliminar permanentemente la cuenta de "${userRow.email}"?`)) return;

    setActionLoadingId(userRow.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userRow.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'No se pudo eliminar el usuario.' });
        return;
      }
      setFeedback({ type: 'success', message: `Usuario ${userRow.email} eliminado.` });
      await fetchGovernanceData();
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión al eliminar el usuario.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando panel de gobernanza...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-10 text-center space-y-3">
            <Lock className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Acceso Restringido</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isDemo
                ? 'La gestión de empresas y accesos internos está deshabilitada en la Sesión de Prueba.'
                : 'Solo los administradores autorizados pueden gestionar accesos y organizaciones.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter((u) => u.status === 'active');
  const selectableCompanies = companies.filter((c) => !c.is_demo);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSuperAdmin ? 'Gobernanza Multi-Empresa & Accesos' : `Equipo y Accesos — ${organization?.name}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? 'Aprovisiona empresas privadas aisladas por RLS, gestiona el Sandbox Demo y autoriza cuentas.'
                : 'Administra los integrantes autorizados de tu organización privada.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSuperAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Empresa
            </Button>
          )}
          <Badge variant="outline" className="py-1.5 px-3">
            {isSuperAdmin ? 'Super Admin Global' : 'Admin de Empresa'}
          </Badge>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Company Invite Code Banner (for Company Admins or DUO Admin) */}
      {organization?.invite_code && !organization.is_demo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  Código de Invitación de {organization.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Compártelo con colaboradores de tu empresa para que al registrarse queden pre-vinculados a tu espacio privado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBrandingTarget(organization)}
                className="gap-1.5 bg-background"
              >
                <Paintbrush className="h-3.5 w-3.5" />
                Personalizar Marca / Logo
              </Button>
              <code className="px-3 py-1.5 rounded-lg bg-background border font-mono text-sm font-semibold tracking-wider">
                {organization.invite_code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyInviteCode(organization.invite_code!)}
              >
                {copiedCode === organization.invite_code ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {isSuperAdmin ? (
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresas y Demo ({companies.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuarios y Solicitudes
              {pendingUsers.length > 0 && (
                <Badge className="ml-1 bg-amber-500 text-white border-0 px-1.5 py-0 text-[10px]">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Seguridad y 2FA
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: COMPANIES */}
          <TabsContent value="companies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => {
                const isDuo = company.slug === DUO_ORG_SLUG;
                return (
                  <Card
                    key={company.id}
                    className={`flex flex-col justify-between transition-all ${
                      company.is_demo
                        ? 'border-amber-500/40 bg-amber-500/[0.03]'
                        : isDuo
                        ? 'border-primary/40 bg-primary/[0.02]'
                        : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <CompanyLogoMark
                            name={company.name}
                            logoUrl={company.logo_url}
                            isDemo={company.is_demo}
                            size="md"
                          />
                          <div className="space-y-1 min-w-0">
                            <CardTitle className="text-base truncate" title={company.name}>
                              {company.name}
                            </CardTitle>
                            <CardDescription className="text-xs font-mono truncate">
                              slug: {company.slug}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {company.is_demo && (
                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Demo Pública
                            </Badge>
                          )}
                          {isDuo && (
                            <Badge className="bg-primary/15 text-primary border-primary/30">
                              Casa Matriz
                            </Badge>
                          )}
                          {!company.is_demo && !isDuo && (
                            <Badge variant={company.is_active ? 'outline' : 'destructive'}>
                              {company.is_active ? 'Activa' : 'Suspendida'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Usuarios</span>
                          <span className="font-semibold text-sm">{company.users_count}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Eventos Activos</span>
                          <span className="font-semibold text-sm">{company.events_count}</span>
                        </div>
                      </div>

                      {company.invite_code && !company.is_demo && (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">Código Invitación:</span>
                          <button
                            type="button"
                            onClick={() => handleCopyInviteCode(company.invite_code!)}
                            className="inline-flex items-center gap-1.5 font-mono font-semibold bg-muted px-2 py-1 rounded hover:bg-muted/80 cursor-pointer"
                            title="Copiar código"
                          >
                            {company.invite_code}
                            {copiedCode === company.invite_code ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      )}

                      {company.is_demo && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Cuota por sesión: máx. {company.max_demo_events} eventos nuevos y{' '}
                          {company.max_demo_costs} ítems de tarifario. Auto-limpieza &gt;24h.
                        </p>
                      )}

                      <div className="pt-2 border-t space-y-2">
                        {organization?.id === company.id ? (
                          <div className="text-center py-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            Entorno Visualizado Actualmente
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchCompany(company.id)}
                            disabled={actionLoadingId === `switch-${company.id}`}
                            className={`w-full gap-2 ${
                              company.is_demo
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold'
                                : ''
                            }`}
                          >
                            {actionLoadingId === `switch-${company.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <LogIn className="h-3.5 w-3.5" />
                            )}
                            {company.is_demo ? 'Entrar a Cuenta Demo' : 'Entrar / Inspeccionar'}
                          </Button>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {company.is_demo ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleResetDemoSandbox}
                              disabled={actionLoadingId === 'reset-demo'}
                              className="w-full gap-2 border-amber-500/40 hover:bg-amber-500/10"
                            >
                              {actionLoadingId === 'reset-demo' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3.5 w-3.5" />
                              )}
                              Resetear Demo Ahora
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBrandingTarget(company)}
                                className="gap-1.5 flex-1"
                              >
                                <Paintbrush className="h-3.5 w-3.5" />
                                Marca / Logo
                              </Button>
                              {!isDuo && (
                                <Button
                                  variant={company.is_active ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => handleToggleCompanyActive(company)}
                                  disabled={actionLoadingId === company.id}
                                  className="gap-1.5 flex-1"
                                >
                                  <Power className="h-3.5 w-3.5" />
                                  {company.is_active ? 'Suspender' : 'Reactivar'}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 2: USERS */}
          <TabsContent value="users" className="space-y-6">
            <UsersManagementSection
              pendingUsers={pendingUsers}
              activeUsers={activeUsers}
              companies={selectableCompanies}
              isSuperAdmin={true}
              currentUserId={profile?.id}
              actionLoadingId={actionLoadingId}
              pendingOrgChoice={pendingOrgChoice}
              setPendingOrgChoice={setPendingOrgChoice}
              pendingRoleChoice={pendingRoleChoice}
              setPendingRoleChoice={setPendingRoleChoice}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          </TabsContent>

          {/* TAB 3: SECURITY & 2FA */}
          <TabsContent value="security" className="space-y-4">
            <MfaSettingsCard />
          </TabsContent>
        </Tabs>
      ) : (
        <UsersManagementSection
          pendingUsers={pendingUsers}
          activeUsers={activeUsers}
          companies={organization ? [organization] : []}
          isSuperAdmin={false}
          currentUserId={profile?.id}
          actionLoadingId={actionLoadingId}
          pendingOrgChoice={pendingOrgChoice}
          setPendingOrgChoice={setPendingOrgChoice}
          pendingRoleChoice={pendingRoleChoice}
          setPendingRoleChoice={setPendingRoleChoice}
          onUpdateUser={handleUpdateUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* CREATE COMPANY DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} className="max-w-2xl">
        <form onSubmit={handleCreateCompany} className="flex flex-col max-h-[85dvh]">
          <DialogHeader>
            <DialogTitle>
              <Building2 className="h-5 w-5 text-primary" />
              Crear Nueva Empresa Cliente (Tenant Privado)
            </DialogTitle>
            <DialogDescription>
              Cada empresa cuenta con base de datos aislada mediante RLS estricto, catálogo propio y branding en cotizaciones PDF.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <LogoUploadField
              companyName={formState.name}
              logoUrl={formState.logo_url}
              onChange={(nextUrl) => setFormState({ ...formState, logo_url: nextUrl })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nombre Comercial *</label>
                <Input
                  required
                  placeholder="Ej: Productora Andes SpA"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Razón Social (Opcional)</label>
                <Input
                  placeholder="Ej: Andes Eventos y Producción Ltda."
                  value={formState.legal_name}
                  onChange={(e) => setFormState({ ...formState, legal_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">RUT Empresa (Opcional)</label>
                <Input
                  placeholder="76.123.456-7"
                  value={formState.rut}
                  onChange={(e) => setFormState({ ...formState, rut: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ciudad / Ubicación</label>
                <Input
                  placeholder="Santiago, Chile"
                  value={formState.location}
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Email de Contacto</label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.cl"
                  value={formState.contact_email}
                  onChange={(e) => setFormState({ ...formState, contact_email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Código de Invitación (Opcional)</label>
                <Input
                  placeholder="Auto-generado si se deja vacío"
                  value={formState.invite_code}
                  onChange={(e) => setFormState({ ...formState, invite_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/30 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formState.seedStarterCatalog}
                onChange={(e) =>
                  setFormState({ ...formState, seedStarterCatalog: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <span>
                Incluir tarifario inicial base (5 servicios de ejemplo editables para agilizar onboarding)
              </span>
            </label>

            <div className="pt-3 border-t space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administrador Inicial de la Empresa (Opcional)
                </p>
                <p className="text-xs text-muted-foreground">
                  Si completas estos campos, el usuario se creará activo y listo para iniciar sesión de inmediato.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Administrador</label>
                  <Input
                    type="email"
                    placeholder="gerencia@cliente.cl"
                    value={formState.adminEmail}
                    onChange={(e) => setFormState({ ...formState, adminEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Contraseña Inicial</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formState.adminPassword}
                    onChange={(e) => setFormState({ ...formState, adminPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={creating} className="gap-2">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Empresa Aislada
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <CompanyBrandingDialog
        company={brandingTarget}
        open={Boolean(brandingTarget)}
        onOpenChange={(open) => {
          if (!open) setBrandingTarget(null);
        }}
        onSaved={async (message) => {
          setFeedback({ type: 'success', message });
          await fetchGovernanceData();
        }}
      />
    </div>
  );
}

interface UsersManagementSectionProps {
  pendingUsers: UserRow[];
  activeUsers: UserRow[];
  companies: Organization[];
  isSuperAdmin: boolean;
  currentUserId?: string;
  actionLoadingId: string | null;
  pendingOrgChoice: Record<string, string>;
  setPendingOrgChoice: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pendingRoleChoice: Record<string, 'member' | 'admin'>;
  setPendingRoleChoice: React.Dispatch<React.SetStateAction<Record<string, 'member' | 'admin'>>>;
  onUpdateUser: (
    userId: string,
    payload: { status?: 'pending' | 'active'; role?: 'admin' | 'member'; organization_id?: string }
  ) => Promise<void>;
  onDeleteUser: (userRow: UserRow) => Promise<void>;
}

function UsersManagementSection({
  pendingUsers,
  activeUsers,
  companies,
  isSuperAdmin,
  currentUserId,
  actionLoadingId,
  pendingOrgChoice,
  setPendingOrgChoice,
  pendingRoleChoice,
  setPendingRoleChoice,
  onUpdateUser,
  onDeleteUser,
}: UsersManagementSectionProps) {
  const companyOptions = companies.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Solicitudes Pendientes de Aprobación
            <Badge variant="outline">{pendingUsers.length}</Badge>
          </CardTitle>
          <CardDescription>
            Asigna la empresa correcta y el rol antes de autorizar el ingreso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay solicitudes pendientes en este momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    {isSuperAdmin && <TableHead>Empresa Asignada</TableHead>}
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((u) => {
                    const selectedOrg = pendingOrgChoice[u.id] || u.organization_id || companies[0]?.id || '';
                    const selectedRole = pendingRoleChoice[u.id] || 'member';
                    const isBusy = actionLoadingId === u.id;

                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{u.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Solicitado el {new Date(u.created_at).toLocaleDateString('es-CL')}
                          </div>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="min-w-[200px]">
                            <Select
                              value={selectedOrg}
                              options={companyOptions}
                              onChange={(e) =>
                                setPendingOrgChoice((prev) => ({ ...prev, [u.id]: e.target.value }))
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell className="min-w-[140px]">
                          <Select
                            value={selectedRole}
                            options={[
                              { value: 'member', label: 'Miembro' },
                              { value: 'admin', label: 'Admin Empresa' },
                            ]}
                            onChange={(e) =>
                              setPendingRoleChoice((prev) => ({
                                ...prev,
                                [u.id]: e.target.value as 'member' | 'admin',
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={isBusy || !selectedOrg}
                              onClick={() =>
                                onUpdateUser(u.id, {
                                  status: 'active',
                                  role: selectedRole,
                                  ...(isSuperAdmin ? { organization_id: selectedOrg } : {}),
                                })
                              }
                              className="gap-1.5"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => onDeleteUser(u)}
                              className="text-destructive hover:text-destructive gap-1.5"
                            >
                              <UserX className="h-3.5 w-3.5" />
                              Rechazar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Usuarios Activos
            <Badge variant="outline">{activeUsers.length}</Badge>
          </CardTitle>
          <CardDescription>
            Cada cuenta solo accede a los registros de su propia organización.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  {isSuperAdmin && <TableHead>Empresa</TableHead>}
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Gestión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBusy = actionLoadingId === u.id;
                  const orgLabel = u.organizations?.name || 'Sin empresa';

                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{u.email}</span>
                          {u.is_super_admin && (
                            <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                              Super Admin
                            </Badge>
                          )}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              Tú
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <span>{orgLabel}</span>
                            {u.organizations?.is_demo && (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                                Demo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        {u.is_super_admin ? (
                          <Badge variant="outline">Propietario Plataforma</Badge>
                        ) : (
                          <Select
                            value={u.role}
                            disabled={isBusy || isSelf}
                            options={[
                              { value: 'member', label: 'Miembro' },
                              { value: 'admin', label: 'Admin Empresa' },
                            ]}
                            onChange={(e) =>
                              onUpdateUser(u.id, { role: e.target.value as 'member' | 'admin' })
                            }
                            className="w-[150px] h-8 text-xs"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!u.is_super_admin && !isSelf && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => onUpdateUser(u.id, { status: 'pending' })}
                            >
                              Suspender
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isBusy}
                              onClick={() => onDeleteUser(u)}
                              className="text-destructive hover:text-destructive"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
