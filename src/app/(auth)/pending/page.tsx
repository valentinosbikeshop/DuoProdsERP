import Link from 'next/link';
import { Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PendingPage() {
  return (
    <Card className="w-full shadow-lg border-slate-200 animate-in fade-in zoom-in duration-500">
      <CardHeader className="space-y-4 text-center pb-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-4 shadow-sm border border-amber-200">
            <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
          Cuenta Pendiente de Aprobación
        </CardTitle>
        <CardDescription className="text-base text-slate-600">
          Tu registro ha sido recibido exitosamente. Un administrador revisará y aprobará tu cuenta pronto.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-6">
        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
          Recibirás acceso al sistema una vez que tu cuenta sea activada.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center pt-2">
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full font-medium hover:bg-slate-50">
            Volver al inicio de sesión
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
