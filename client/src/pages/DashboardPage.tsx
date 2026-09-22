import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { WalletCards, ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from 'lucide-react';
import { api } from '../api';
import { Dashboard, fmt, TX_TYPE_LABELS } from '../lib';

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get<Dashboard>('/dashboard').then(setData).catch(() => setError('Could not load your dashboard.')).finally(() => setLoading(false)); }, []);

  if (loading) return <section className="page"><p className="sub">Loading your financial picture…</p></section>;
  if (error) return <section className="page"><p className="auth-error">{error}</p></section>;
  if (!data) return null;

  const noData = data.accountsCount === 0;
  if (noData) return (
    <section className="page empty">
      <div className="empty-icon"><WalletCards /></div>
      <p className="eyebrow">PRIVATE WORKSPACE</p>
      <h1>Set up your financial workspace</h1>
      <p className="sub">Your workspace starts empty. Add people, then accounts, then record your first transaction.</p>
      <Link className="add" to="/people"><Plus size={18} />Add a person</Link>
    </section>
  );

  const w = data.whereDidMyMoneyGo;
  return (
    <section className="page">
      <div className="welcome">
        <div><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Your financial picture</h1><p className="sub">This month, in your authenticated workspace only.</p></div>
        <Link className="add mobile-add" to="/transactions"><Plus size={18} />Add transaction</Link>
      </div>
      <div className="metrics">
        <Metric icon={<WalletCards />} label="Total cash & bank" value={fmt(data.totalMoneyMinor)} delta="Assets across all accounts" tone="purple" />
        <Metric icon={<ArrowDownLeft />} label="This month expenses" value={fmt(data.monthExpensesMinor)} delta="Actual expenses only" tone="orange" />
        <Metric icon={<ArrowUpRight />} label="This month income" value={fmt(data.monthIncomeMinor)} delta="Income & cashback" tone="green" />
        <Metric icon={<CreditCard />} label="Credit outstanding" value={fmt(data.creditOutstandingMinor)} delta="Liability, separate from assets" tone="pink" />
      </div>

      <div className="panel" style={{ marginTop: 22, padding: 22 }}>
        <p className="eyebrow">WHERE DID MY MONEY GO?</p>
        <h2 style={{ margin: '6px 0 16px' }}>This month</h2>
        <div className="wmg-grid">
          <WmgRow label="Actual expenses" value={fmt(w.actualExpensesMinor)} strong />
          <WmgRow label="Transfers (not spending)" value={fmt(w.transfersMinor)} />
          <WmgRow label="Credit card payments (not spending)" value={fmt(w.creditCardPaymentsMinor)} />
          <WmgRow label="Cash withdrawals (not spending)" value={fmt(w.cashWithdrawalsMinor)} />
        </div>
        <p className="sub" style={{ marginTop: 12 }}>Net worth: <b>{fmt(data.netWorthMinor)}</b> (cash & bank minus credit outstanding)</p>
      </div>

      <div className="panel" style={{ marginTop: 22, padding: 22 }}>
        <p className="eyebrow">RECENT ACTIVITY</p>
        {!data.recent.length ? <p className="sub" style={{ marginTop: 10 }}>No transactions yet.</p> : (
          <div style={{ marginTop: 10 }}>
            {data.recent.map(t => (
              <div className="tx" key={t._id}>
                <div className="tx-icon"><ArrowDownLeft /></div>
                <div className="tx-main"><b>{t.merchant || TX_TYPE_LABELS[t.type]}</b><small>{TX_TYPE_LABELS[t.type]} · {t.paymentMethod.replace('_', ' ')}</small></div>
                <div className="tx-right"><b>{fmt(t.amountMinor)}</b><small>{t.transactionDate}</small></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ icon, label, value, delta, tone }: { icon: any; label: string; value: string; delta: string; tone: string }) {
  return <div className="metric"><div className={'metric-icon ' + tone}>{icon}</div><div><p>{label}</p><h2>{value}</h2><small>{delta}</small></div></div>;
}
function WmgRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="wmg-row"><span>{label}</span><b className={strong ? 'wmg-strong' : ''}>{value}</b></div>;
}
