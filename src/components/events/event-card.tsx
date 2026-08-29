import Link from 'next/link';
import { Calendar, MapPin, Building2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const statusColor = EVENT_STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-800';
  const statusLabel = EVENT_STATUS_LABELS[event.status] || event.status;

  const formattedDate = event.event_date
    ? new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(event.event_date))
    : 'Fecha por definir';

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full animate-in fade-in duration-300 flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold line-clamp-2">{event.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-2 text-sm">
                <Building2 className="w-4 h-4" />
                {event.client_company || 'Sin empresa'}
              </CardDescription>
            </div>
            {event.status === 'planning' && onDelete && (
              <button 
                onClick={(e) => onDelete(event.id, e)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="Mover a papelera"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{event.location || 'Ubicación por definir'}</span>
          </div>
          <div className="mt-2">
            <Badge variant="outline" className={cn("border-none", statusColor)}>
              {statusLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
