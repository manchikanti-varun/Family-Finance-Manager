import { useEffect, useState } from 'react';
import { Plus, Users, X } from 'lucide-react';
import { api } from '../api';
import { Person } from '../lib';

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => { setLoading(true); api.get<Person[]>('/persons').then(setPeople).catch(() => setError('Could not load people.')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/persons', { name, email: email || undefined }); setName(''); setEmail(''); setShow(false); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create person.'); } finally { setBusy(false); }
  };

  return (
    <section className="page">
      <div className="page-title">
        <div><p className="eyebrow">FINANCIAL IDENTITIES</p><h1>People</h1><p className="sub">People are who spent money or own accounts. They do not need their own login.</p></div>
        <button className="add" onClick={() => setShow(true)}><Plus size={18} />Add person</button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {loading ? <p className="sub">Loading…</p> : !people.length ? (
        <div className="events-empty"><div className="empty-icon"><Users /></div><h2>No people yet</h2><p>Add family members like Mom, Dad, or Sister to track who spent and whose account was used.</p><button className="add" onClick={() => setShow(true)}><Plus size={18} />Add your first person</button></div>
      ) : (
        <div className="events-grid">
          {people.map(p => (
            <article className="event-card" key={p._id}>
              <span className="event-type">{p.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
              <h2>{p.name}</h2>
              {p.email && <p>{p.email}</p>}
            </article>
          ))}
        </div>
      )}
      {show && (
        <div className="modal-backdrop" onMouseDown={() => setShow(false)}>
          <form className="modal event-form" onSubmit={create} onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">NEW PERSON</p><h2>Add a financial identity</h2></div><button type="button" className="icon" onClick={() => setShow(false)}><X /></button></div>
            <label>Name<input autoFocus value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Mom" /></label>
            <label>Email (optional)<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional" /></label>
            <button className="save" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add person'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
