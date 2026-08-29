import { EventForm } from '@/components/events/event-form';

export default function NewEventPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Nuevo Evento</h1>
      <p className="text-muted-foreground mb-8">Completa los datos para crear un nuevo evento.</p>
      <EventForm />
    </div>
  );
}
