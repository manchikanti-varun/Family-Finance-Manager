import { useEffect, useState } from 'react';
import { Plus, Landmark, X } from 'lucide-react';
import { api } from '../api';
import { Account, AccountType, Person, fmt, toMinor } from '../lib';

const TYPE_LABELS: Record<AccountType, string> = { BANK_ACCOUNT: 'Bank account', CREDIT_CARD: 'Credit card', CASH: 'Cash', WALLET: 'Wallet' };

export default function Accounts({ cardsOnly = false }: { cardsOnly?: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [ownerPersonId, setOwner] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(cardsOnly ? 'CREDIT_CARD' : 'BANK_ACCOUNT');
  const [bankName, setBankName] = useState('');
  const [opening, setOpening] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [outstanding, setOutstanding] = useState('0');
  const [cardNumber, setCardNumber] = useState('');
  const [linkedBankAccountId, setLinked] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.get<Account[]>('/accounts'), api.get<Person[]>('/persons')])
      .then(([a, p]) => { setAccounts(a); setPeople(p); if (p[0] && !ownerPersonId) setOwner(p[0]._id); })
      .catch(() => setError('Could not load accounts.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const visible = cardsOnly ? accounts.filter(a => a.accountType === 'CREDIT_CARD') : accounts;
  const banks = accounts.filter(a => a.accountType === 'BANK_ACCOUNT');
  const personName = (id?: string) => people.find(p => p._id === id)?.name || '—';

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body: any = { ownerPersonId, accountName, accountType, bankName: bankName || undefined, openingBalanceMinor: toMinor(opening || '0') };
      if (accountType === 'CREDIT_CARD') { body.creditLimitMinor = toMinor(creditLimit || '0'); body.currentOutstandingMinor = toMinor(outstanding || '0'); }
      if (cardNumber.trim()) body.cardNumber = cardNumber.replace(/\s+/g, '');
      if (linkedBankAccountId) body.linkedBankAccountId = linkedBankAccountId;
      await api.post('/accounts', body);
      setShow(false); setAccountName(''); setBankName(''); setOpening('0'); setCreditLimit(''); setOutstanding('0'); setCardNumber(''); setLinked('');
      load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create account.'); } finally { setBusy(false); }
  };

  const noPeople = !loading && !people.length;

  return (
    <section className="page">
      <div className="page-title">
        <div><p className="eyebrow">SOURCES OF MONEY</p><h1>{cardsOnly ? 'Cards' : 'Accounts'}</h1><p className="sub">Bank accounts, credit cards, cash and wallets. Balances are tracked from your transactions.</p></div>
        <button className="add" onClick={() => setShow(true)} disabled={noPeople}><Plus size={18} />Add {cardsOnly ? 'card' : 'account'}</button>
      </div>
      {noPeople && <p className="auth-error">Add a person first — every account needs an owner.</p>}
      {error && <p className="auth-error">{error}</p>}
      {loading ? <p className="sub">Loading…</p> : !visible.length ? (
        <div className="events-empty"><div className="empty-icon"><Landmark /></div><h2>No {cardsOnly ? 'cards' : 'accounts'} yet</h2><p>Add {cardsOnly ? 'a credit card' : 'a bank account, cash, or wallet'} so you can start recording transactions.</p><button className="add" onClick={() => setShow(true)} disabled={noPeople}><Plus size={18} />Add {cardsOnly ? 'card' : 'account'}</button></div>
      ) : (
        <div className="events-grid">
          {visible.map(a => (
            <article className="event-card" key={a._id}>
              <span className="event-type">{TYPE_LABELS[a.accountType]}</span>
              <h2>{a.accountName}{a.last4Digits ? ` •••• ${a.last4Digits}` : ''}</h2>
              <p>{a.bankName || ''} · {personName(a.ownerPersonId)}{a.status !== 'ACTIVE' ? ` · ${a.status}` : ''}</p>
              <div>
                {a.accountType === 'CREDIT_CARD'
                  ? <><span>Outstanding</span><b>{fmt(a.currentOutstandingMinor || 0)}</b></>
                  : <><span>Balance</span><b>{fmt(a.currentBalanceMinor || 0)}</b></>}
              </div>
              {a.accountType === 'CREDIT_CARD' && <small>Available {fmt(a.availableCreditMinor || 0)} of {fmt(a.creditLimitMinor || 0)}</small>}
            </article>
          ))}
        </div>
      )}
      {show && (
        <div className="modal-backdrop" onMouseDown={() => setShow(false)}>
          <form className="modal event-form" onSubmit={create} onMouseDown={e => e.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">NEW {cardsOnly ? 'CARD' : 'ACCOUNT'}</p><h2>Add a money source</h2></div><button type="button" className="icon" onClick={() => setShow(false)}><X /></button></div>
            <label>Owner<select value={ownerPersonId} onChange={e => setOwner(e.target.value)} required>{people.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>
            <label>Type<select value={accountType} onChange={e => setAccountType(e.target.value as AccountType)}>{(cardsOnly ? ['CREDIT_CARD'] : ['BANK_ACCOUNT', 'CASH', 'WALLET', 'CREDIT_CARD']).map(t => <option key={t} value={t}>{TYPE_LABELS[t as AccountType]}</option>)}</select></label>
            <label>Name<input autoFocus value={accountName} onChange={e => setAccountName(e.target.value)} required placeholder={accountType === 'CASH' ? 'e.g. Mom Cash' : 'e.g. SBI Savings'} /></label>
            {accountType !== 'CASH' && <label>Bank / issuer<input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. SBI, HDFC" /></label>}
            {accountType === 'CREDIT_CARD' ? (
              <>
                <label>Credit limit (₹)<input inputMode="decimal" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} required placeholder="100000" /></label>
                <label>Current outstanding (₹)<input inputMode="decimal" value={outstanding} onChange={e => setOutstanding(e.target.value)} placeholder="0" /></label>
                <label>Card number (optional, encrypted)<input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" /></label>
              </>
            ) : (
              <label>Opening balance (₹)<input inputMode="decimal" value={opening} onChange={e => setOpening(e.target.value)} placeholder="0" /></label>
            )}
            {(accountType === 'DEBIT_CARD' as any) && banks.length > 0 && (
              <label>Linked bank account<select value={linkedBankAccountId} onChange={e => setLinked(e.target.value)}><option value="">None</option>{banks.map(b => <option key={b._id} value={b._id}>{b.accountName}</option>)}</select></label>
            )}
            <button className="save" disabled={busy || !accountName.trim() || !ownerPersonId}>{busy ? 'Adding…' : `Add ${cardsOnly ? 'card' : 'account'}`}</button>
          </form>
        </div>
      )}
    </section>
  );
}
