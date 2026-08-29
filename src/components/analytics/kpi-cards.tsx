import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCLP, formatPercentage } from '@/lib/utils';
import { TrendingUp, DollarSign, Receipt, PiggyBank, BarChart3, Calculator } from 'lucide-react';
import { FinancialSummary } from '@/types';

export function KpiCards({ data }: { data: FinancialSummary }) {
  const cards = [
    {
      title: 'Ingresos Totales Brutos',
      value: formatCLP(data.totalIngresosBrutos),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Facturación Neta',
      value: formatCLP(data.facturacionNeta),
      icon: Receipt,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Costos Operativos',
      value: formatCLP(data.costosOperativos),
      icon: Calculator,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Utilidad Neta',
      value: formatCLP(data.utilidadNeta),
      icon: PiggyBank,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      title: 'Margen Promedio',
      value: formatPercentage(data.margenPromedio),
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'IVA Débito Fiscal',
      value: formatCLP(data.ivaDebitoFiscal),
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <Card 
          key={index}
          className="animate-fade-in opacity-0 fill-mode-forwards"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
