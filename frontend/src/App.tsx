import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Eye, CheckCircle, XCircle, AlertCircle, Loader2, Search } from 'lucide-react';

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

type Notification = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
};

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTicket, setNewTicket] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const addNotification = (type: Notification['type'], message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

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
            addNotification('success', 'Nuevo ticket recibido');
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
        addNotification('success', 'Ticket creado exitosamente');
      } else {
        addNotification('error', 'Error al crear el ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      addNotification('error', 'Error de conexión al crear ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-slate-100">
      <main className="container mx-auto max-w-4xl">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3"
        >
          <img src="/logo.svg" alt="Logo Support Co-Pilot" className="h-10 w-10" />
          <div>
            <h1 className="text-2xl font-semibold">AI Support Co-Pilot</h1>
            <p className="text-slate-400">Dashboard en tiempo real de tickets procesados.</p>
            <div className="mt-2 text-xs text-slate-500">
              Realtime: <span className="text-slate-300" aria-live="polite">{realtimeStatus}</span>
            </div>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 card"
        >
          <h2 className="mb-3 font-semibold">Crear Nuevo Ticket</h2>
          <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Crear ticket">
            <input
              type="text"
              aria-label="Descripción del ticket"
              value={newTicket}
              onChange={(e) => setNewTicket(e.target.value)}
              placeholder="Describe el problema o consulta..."
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-primary-400"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newTicket.trim()}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
              aria-disabled={submitting || !newTicket.trim()}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'Creando...' : 'Crear Ticket'}
            </button>
          </form>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between px-1 py-3 border-b border-slate-800">
            <h2 className="font-semibold">Tickets</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-100 placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-primary-400"
                />
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
          </div>
          <div className="divide-y divide-slate-800">
            {filteredTickets.length === 0 && !loading && (
              <div className="p-4 text-slate-400">No hay tickets aún.</div>
            )}
            <AnimatePresence>
              {filteredTickets.map((ticket) => (
                <motion.article
                  key={ticket.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm text-slate-400">{ticket.id}</div>
                      <div className="mt-1">{ticket.description}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="px-2 py-1 rounded border border-slate-700 text-xs">{ticket.category || 'Sin categoría'}</span>
                      <span className={`px-2 py-1 rounded border text-xs ${sentimentColor(ticket.sentiment)}`}>
                        {ticket.sentiment === 'positivo' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {ticket.sentiment === 'negativo' && <XCircle className="w-3 h-3 inline mr-1" />}
                        {ticket.sentiment || 'Neutral'}
                      </span>
                      <span className="px-2 py-1 rounded border border-slate-700 text-xs">
                        {ticket.processed ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertCircle className="w-3 h-3 inline mr-1" />}
                        {ticket.processed ? 'Procesado' : 'Pendiente'}
                      </span>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="btn-primary text-xs px-2 py-1"
                        aria-label={`Ver detalles de ticket ${ticket.id}`}
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{new Date(ticket.created_at).toLocaleString()}</div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* Modal para detalles de ticket */}
        <AnimatePresence>
          {selectedTicket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedTicket(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">Detalles del Ticket</h3>
                <div className="space-y-2">
                  <p><strong>ID:</strong> {selectedTicket.id}</p>
                  <p><strong>Descripción:</strong> {selectedTicket.description}</p>
                  <p><strong>Categoría:</strong> {selectedTicket.category || 'Sin categoría'}</p>
                  <p><strong>Sentimiento:</strong> {selectedTicket.sentiment || 'Neutral'}</p>
                  <p><strong>Estado:</strong> {selectedTicket.processed ? 'Procesado' : 'Pendiente'}</p>
                  <p><strong>Creado:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn-primary mt-4 w-full"
                >
                  Cerrar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notificaciones */}
        <div className="fixed top-4 right-4 z-40 space-y-2">
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                className={`p-4 rounded-lg shadow-lg ${
                  notification.type === 'success' ? 'bg-green-600' :
                  notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                } text-white`}
              >
                {notification.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
