import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '../api';
import { FinEvent, Transaction, fmt, TX_TYPE_LABELS } from '../lib';

type Analytics = {
  spentMinor: number;
  byPaymentMethod: { _id: string; amountMinor: number }[];
  bySpender: { _id: string; amountMinor: number }[];
  byAccountOwner: { _id: string; amountMinor: number }[];
};

export default function EventDetail() {
  const { eventId } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState<FinEvent | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([
      api.get<FinEvent>(`/events/${eventId}`),
      api.get<Transaction[]>(`/events/${eventId}/transactions`),
      api.get<Analytics>(`/events/${eventId}/analytics`)
    ]).then(([e, t, a]) => { setEvent(e); setTxns(t); setAnalytics(a); })
      .catch(() => setError('Could not load this event.')).finally(() => setLoading(false));
  }, [eventId]);

  const remove = async () => {
    if (!confirm('Delete this event? The event will be deleted, but its transactions will remain in your account.')) return;
    try { await api.del(`/events/${eventId}`); nav('/events', { replace: true }); }
    catch { setError('Could not delete the event.'); }
  };

  if (loading) return <section className="page"><p className="sub">Loading…</p></section>;
  if (error) return <section className="page"><p className="auth-error">{error}</p></section>;
  if (!event) return null;

  const remaining = event.budgetMinor !== undefined ? event.budgetMinor - event.spentMinor : undefined;

  return (
    <section className="page">
      <Link to="/events" className="back-link"><ArrowLeft size={16} />Events</Link>
      <div className="page-title">
        <div><p className="eyebrow">{event.type}</p><h1>{event.name}</h1><p className="sub">{event.startDate}{event.endDate ? ` – ${event.endDate}` : ''} · {event.status}</p></div>
        <button className="add danger" onClick={remove}><Trash2 size={16} />Delete event</button>
      </div>

      <div className="metrics">
        <div className="metric"><div className="metric-icon purple" /><div><p>Total spent</p><h2>{fmt(event.spentMinor)}</h2><small>Actual expenses only</small></div></div>
        {event.budgetMinor !== undefined && <div className="metric"><div className="metric-icon green" /><div><p>Budget</p><h2>{fmt(event.budgetMinor)}</h2><small>Planned</small></div></div>}
        {remaining !== undefined && <div className="metric"><div className="metric-icon orange" /><div><p>Remaining</p><h2>{fmt(remaining)}</h2><small>Budget minus spent</small></div></div>}
      </div>

      {analytics && (
        <div className="panel" style={{ marginTop: 22, padding: 22 }}>
          <p className="eyebrow">BY PAYMENT METHOD</p>
          <div className="wmg-grid" style={{ marginTop: 10 }}>
            {analytics.byPaymentMethod.length ? analytics.byPaymentMethod.map(r => <div className="wmg-row" key={r._id}><span>{r._id?.replace('_', ' ') || 'Other'}</span><b>{fmt(r.amountMinor)}</b></div>) : <p className="sub">No spending yet.</p>}
          </div>
        </div>
      )}

      <div className="panel table" style={{ marginTop: 22 }}>
        <div className="table-head"><span>Date</span><span>Transaction</span><span>Method</span><span>Amount</span></div>
        {!txns.length ? <p className="sub" style={{ padding: 18 }}>No transactions in this event yet. Add a transaction and select this event.</p> : txns.map(t => (
          <div className="table-row four" key={t._id}>
            <small>{t.transactionDate}</small>
            <div><b>{t.merchant || TX_TYPE_LABELS[t.type]}</b><small>{TX_TYPE_LABELS[t.type]}</small></div>
            <span className="method">{t.paymentMethod.replace('_', ' ')}</span>
            <b>{fmt(t.amountMinor)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
