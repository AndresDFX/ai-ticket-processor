import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Ticket = {
  id: string;
  created_at: string;
  description: string;
  category: string | null;
  sentiment: string | null;
  processed: boolean;
};

const sentimentColor = (sentiment?: string | null) => {
  switch ((sentiment || '').toLowerCase()) {
    case 'negativo':
      return 'bg-red-500/10 text-red-300 border-red-500/30';
    case 'positivo':
      return 'bg-green-500/10 text-green-300 border-green-500/30';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicket, setNewTicket] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setTickets(data as Ticket[]);
      setLoading(false);
    };

    fetchTickets();

    const upsertTicket = (incoming: Ticket) => {
      setTickets((prev) => {
        const index = prev.findIndex((t) => t.id === incoming.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = incoming;
          return next;
        }
        return [incoming, ...prev];
      });
    };

    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            upsertTicket(payload.new as Ticket);
            return;
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            upsertTicket(payload.new as Ticket);
            return;
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            setTickets((prev) =>
              prev.filter((ticket) => ticket.id !== (payload.old as Ticket).id)
            );
            return;
          }
          fetchTickets();
        }
      )
      .subscribe((status) => setRealtimeStatus(status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newTicket }),
      });
      if (response.ok) {
        setNewTicket('');
        // El dashboard se actualizará automáticamente vía Realtime
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <header className="mb-6 flex items-center gap-3">
        <img src="/logo.svg" alt="Support Co-Pilot" className="h-10 w-10" />
        <div>
          <h1 className="text-2xl font-semibold">AI Support Co-Pilot</h1>
          <p className="text-slate-400">
            Dashboard en tiempo real de tickets procesados.
          </p>
          <div className="mt-2 text-xs text-slate-500">
            Realtime: <span className="text-slate-300">{realtimeStatus}</span>
          </div>
        </div>
      </header>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 font-semibold">Crear Nuevo Ticket</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newTicket}
            onChange={(e) => setNewTicket(e.target.value)}
            placeholder="Describe el problema o consulta..."
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newTicket.trim()}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creando...' : 'Crear Ticket'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="font-semibold">Tickets</h2>
          {loading && <span className="text-slate-400 text-sm">Cargando...</span>}
        </div>
        <div className="divide-y divide-slate-800">
          {tickets.length === 0 && !loading && (
            <div className="p-4 text-slate-400">No hay tickets aún.</div>
          )}
          {tickets.map((ticket) => (
            <div key={ticket.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="text-sm text-slate-400">{ticket.id}</div>
                  <div className="mt-1">{ticket.description}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2 py-1 rounded border border-slate-700 text-xs">
                    {ticket.category || 'Sin categoría'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded border text-xs ${sentimentColor(
                      ticket.sentiment
                    )}`}
                  >
                    {ticket.sentiment || 'Neutral'}
                  </span>
                  <span className="px-2 py-1 rounded border border-slate-700 text-xs">
                    {ticket.processed ? 'Procesado' : 'Pendiente'}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                {new Date(ticket.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
