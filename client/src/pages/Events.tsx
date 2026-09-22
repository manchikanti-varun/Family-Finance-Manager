import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, X } from 'lucide-react';
import { api } from '../api';
import { FinEvent, EventType, fmt, toMinor } from '../lib';

const TYPES: EventType[] = ['TRIP', 'VACATION', 'FAMILY', 'SHOPPING', 'BIRTHDAY', 'WEDDING', 'FESTIVAL', 'COLLEGE', 'PROJECT', 'EMERGENCY', 'OTHER'];

export default function Events() {
  const [items, setItems] = useState<FinEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('TRIP');
  const [startDate, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEnd] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => { setLoading(true); api.get<FinEvent[]>('/events').then(setItems).catch(() => setError('Could not load events.')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body: any = { name, type, startDate, status: 'ACTIVE' };
      if (endDate) body.endDate = endDate;
      if (budget) body.budgetMinor = toMinor(budget);
      await api.post('/events', body);
      setName(''); setBudget(''); setEnd(''); setShow(false); load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create event.'); } finally { setBusy(false); }
  };

  return (
    <section className="page">
      <div className="page-title">
        <div><p className="eyebrow">GROUP YOUR SPENDING</p><h1>Events</h1><p className="sub">Trips, celebrations and projects — connected to their real transactions.</p></div>
        <button className="add" onClick={() => setShow(true)}><Plus size={18} />Create event</button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {loading ? <p className="sub">Loading…</p> : !items.length ? (
        <div className="events-empty"><div className="empty-icon"><CalendarDays /></div><h2>No events yet</h2><p>Create an event to group a trip, vacation, shopping or other activity expenses.</p><button className="add" onClick={() => setShow(true)}><Plus size={18} />Create your first event</button></div>
      ) : (
        <div className="events-grid">
          {items.map(e => (
            <Link className="event-card" key={e._id} to={`/events/${e._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="event-type">{e.type}</span>
              <h2>{e.name}</h2>
              <p>{e.startDate}{e.endDate ? ` – ${e.endDate}` : ''}</p>
              <div><span>Actual spent</span><b>{fmt(e.spentMinor)}</b></div>
              <small>{e.transactionCount} transactions{e.budgetMinor !== undefined ? ` · ${fmt(e.budgetMinor)} budget` : ''}</small>
            </Link>
          ))}
        </div>
      )}
      {show && (
        <div className="modal-backdrop" onMouseDown={() => setShow(false)}>
          <form className="modal event-form" onSubmit={create} onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">NEW EVENT</p><h2>Group a financial activity</h2></div><button type="button" className="icon" onClick={() => setShow(false)}><X /></button></div>
            <label>Event name<input autoFocus value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Goa Trip" /></label>
            <label>Type<select value={type} onChange={e => setType(e.target.value as EventType)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Start date<input type="date" value={startDate} onChange={e => setStart(e.target.value)} required /></label>
            <label>End date (optional)<input type="date" value={endDate} onChange={e => setEnd(e.target.value)} /></label>
            <label>Budget ₹ (optional)<input inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} placeholder="30000" /></label>
            <button className="save" disabled={busy || !name.trim()}>{busy ? 'Creating…' : 'Create event'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
