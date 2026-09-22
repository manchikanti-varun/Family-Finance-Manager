import { useEffect, useMemo, useState } from 'react';
import { Plus, ReceiptText, X } from 'lucide-react';
import { api, uuid } from '../api';
import { Account, FinEvent, Person, Transaction, TxType, PaymentMethod, fmt, toMinor, TX_TYPE_LABELS } from '../lib';

const TYPE_OPTIONS: TxType[] = ['UPI_PAYMENT', 'DEBIT_CARD_PAYMENT', 'CASH_EXPENSE', 'EXPENSE', 'CREDIT_CARD_PURCHASE', 'INCOME', 'TRANSFER', 'CASH_WITHDRAWAL', 'CREDIT_CARD_PAYMENT', 'REFUND', 'FEE', 'INTEREST', 'CASHBACK'];
// Default payment method implied by the chosen type.
const METHOD_FOR: Partial<Record<TxType, PaymentMethod>> = { UPI_PAYMENT: 'UPI', DEBIT_CARD_PAYMENT: 'DEBIT_CARD', CASH_EXPENSE: 'CASH', CREDIT_CARD_PURCHASE: 'CREDIT_CARD', CREDIT_CARD_PAYMENT: 'BANK_TRANSFER', CASH_WITHDRAWAL: 'CASH', TRANSFER: 'BANK_TRANSFER', INCOME: 'BANK_TRANSFER', REFUND: 'BANK_TRANSFER', FEE: 'OTHER', INTEREST: 'OTHER', CASHBACK: 'OTHER', EXPENSE: 'OTHER' };
const NEEDS_DEST: TxType[] = ['TRANSFER', 'CASH_WITHDRAWAL', 'CREDIT_CARD_PAYMENT'];
const NEEDS_SPENDER: TxType[] = ['EXPENSE', 'UPI_PAYMENT', 'DEBIT_CARD_PAYMENT', 'CASH_EXPENSE', 'CREDIT_CARD_PURCHASE'];

export default function Transactions() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<FinEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Transaction[]>('/transactions'),
      api.get<Account[]>('/accounts'),
      api.get<Person[]>('/persons'),
      api.get<FinEvent[]>('/events')
    ]).then(([t, a, p, e]) => { setItems(t); setAccounts(a); setPeople(p); setEvents(e); })
      .catch(() => setError('Could not load transactions.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const personName = (id?: string | null) => people.find(p => p._id === id)?.name || '—';
  const accountName = (id?: string | null) => accounts.find(a => a._id === id)?.accountName || '—';
  const eventName = (id?: string | null) => events.find(e => e._id === id)?.name;

  const filtered = useMemo(() => {
    if (eventFilter === 'all') return items;
    if (eventFilter === 'none') return items.filter(t => !t.eventId);
    return items.filter(t => t.eventId === eventFilter);
  }, [items, eventFilter]);

  const canAdd = accounts.some(a => a.status === 'ACTIVE');

  return (
    <section className="page">
      <div className="page-title">
        <div><p className="eyebrow">ALL ACTIVITY</p><h1>Transactions</h1><p className="sub">Every payment, transfer and movement in one view.</p></div>
        <button className="add" onClick={() => setShow(true)} disabled={!canAdd}><Plus size={18} />Add transaction</button>
      </div>
      {!canAdd && !loading && <p className="auth-error">Add an account first before recording transactions.</p>}
      {error && <p className="auth-error">{error}</p>}

      <div className="filters">
        <label className="filter-inline">Event:&nbsp;
          <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
            <option value="all">All events</option>
            <option value="none">No event</option>
            {events.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
          </select>
        </label>
      </div>

      {loading ? <p className="sub">Loading…</p> : !filtered.length ? (
        <div className="events-empty"><div className="empty-icon"><ReceiptText /></div><h2>No transactions</h2><p>Record a payment, transfer or income to see it here.</p><button className="add" onClick={() => setShow(true)} disabled={!canAdd}><Plus size={18} />Add transaction</button></div>
      ) : (
        <div className="panel table">
          <div className="table-head"><span>Date</span><span>Transaction</span><span>Spent by</span><span>Account</span><span>Method</span><span>Amount</span></div>
          {filtered.map(t => (
            <div className="table-row" key={t._id}>
              <small>{t.transactionDate}</small>
              <div><b>{t.merchant || TX_TYPE_LABELS[t.type]}</b><small>{TX_TYPE_LABELS[t.type]}{eventName(t.eventId) ? ` · 🏷 ${eventName(t.eventId)}` : ''}</small></div>
              <span>{personName(t.spentById)}</span>
              <span>{accountName(t.sourceAccountId)}</span>
              <span className="method">{t.paymentMethod.replace('_', ' ')}{t.upiApp ? ` · ${t.upiApp}` : ''}</span>
              <b>{fmt(t.amountMinor)}</b>
            </div>
          ))}
        </div>
      )}

      {show && <AddTransaction accounts={accounts} people={people} events={events} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </section>
  );
}

function AddTransaction({ accounts, people, events, onClose, onSaved }: { accounts: Account[]; people: Person[]; events: FinEvent[]; onClose: () => void; onSaved: () => void }) {
  const active = accounts.filter(a => a.status === 'ACTIVE');
  const banks = active.filter(a => a.accountType === 'BANK_ACCOUNT' || a.accountType === 'WALLET');
  const cash = active.filter(a => a.accountType === 'CASH');
  const cards = active.filter(a => a.accountType === 'CREDIT_CARD');

  const [type, setType] = useState<TxType>('UPI_PAYMENT');
  const [amount, setAmount] = useState('');
  const [spentById, setSpentBy] = useState(people[0]?._id || '');
  const [sourceAccountId, setSource] = useState('');
  const [destinationAccountId, setDest] = useState('');
  const [upiApp, setUpiApp] = useState('Google Pay');
  const [merchant, setMerchant] = useState('');
  const [eventId, setEventId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const needsDest = NEEDS_DEST.includes(type);
  const needsSpender = NEEDS_SPENDER.includes(type);
  // Which accounts make sense as the source for this type.
  const sourceOptions = type === 'CASH_EXPENSE' ? cash : type === 'CREDIT_CARD_PURCHASE' ? cards : type === 'CASH_WITHDRAWAL' ? banks : active;
  const destOptions = type === 'CREDIT_CARD_PAYMENT' ? cards : type === 'CASH_WITHDRAWAL' ? cash : active;

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body: any = {
        type, amountMinor: toMinor(amount || '0'),
        transactionDate: date, paymentMethod: METHOD_FOR[type] || 'OTHER',
        idempotencyKey: uuid(), status: 'COMPLETED'
      };
      if (sourceAccountId) body.sourceAccountId = sourceAccountId;
      if (needsDest && destinationAccountId) body.destinationAccountId = destinationAccountId;
      if (needsSpender && spentById) body.spentById = spentById;
      if (type === 'UPI_PAYMENT') body.upiApp = upiApp;
      if (merchant.trim()) body.merchant = merchant.trim();
      if (eventId) body.eventId = eventId;
      await api.post('/transactions', body);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save transaction.'); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={save} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">QUICK ADD</p><h2>Add transaction</h2></div><button type="button" className="icon" onClick={onClose}><X /></button></div>
        <div className="amount-input"><span>₹</span><input autoFocus value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0" /></div>
        <div className="form">
          <label>Type<select value={type} onChange={e => { setType(e.target.value as TxType); setSource(''); setDest(''); }}>{TYPE_OPTIONS.map(t => <option key={t} value={t}>{TX_TYPE_LABELS[t]}</option>)}</select></label>
          {needsSpender && <label>Spent by<select value={spentById} onChange={e => setSpentBy(e.target.value)} required>{people.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>}
          {type === 'UPI_PAYMENT' && <label>UPI app<select value={upiApp} onChange={e => setUpiApp(e.target.value)}><option>Google Pay</option><option>PhonePe</option><option>Paytm</option><option>Other</option></select></label>}
          <label>{type === 'CREDIT_CARD_PURCHASE' ? 'Card used' : type === 'CASH_EXPENSE' ? 'Cash account' : 'Source account'}<select value={sourceAccountId} onChange={e => setSource(e.target.value)} required><option value="">Select…</option>{sourceOptions.map(a => <option key={a._id} value={a._id}>{a.accountName}{a.last4Digits ? ` •••• ${a.last4Digits}` : ''}</option>)}</select></label>
          {needsDest && <label>Destination<select value={destinationAccountId} onChange={e => setDest(e.target.value)} required><option value="">Select…</option>{destOptions.map(a => <option key={a._id} value={a._id}>{a.accountName}{a.last4Digits ? ` •••• ${a.last4Digits}` : ''}</option>)}</select></label>}
          <label>Merchant / note<input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="e.g. Swiggy" /></label>
          <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
          <label>Event (optional)<select value={eventId} onChange={e => setEventId(e.target.value)}><option value="">No event</option>{events.map(ev => <option key={ev._id} value={ev._id}>{ev.name}</option>)}</select></label>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button className="save" disabled={busy || !amount || !sourceAccountId}>{busy ? 'Saving…' : 'Save transaction'}</button>
      </form>
    </div>
  );
}
