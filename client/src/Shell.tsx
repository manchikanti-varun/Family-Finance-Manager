import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Landmark, CreditCard, CalendarDays, WalletCards, Bell, ArrowUpRight, Sparkles, Settings, Menu, X, Users } from 'lucide-react';
import { useAuth } from './auth';

const NAV: [string, string, any][] = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Transactions', '/transactions', ReceiptText],
  ['Accounts', '/accounts', Landmark],
  ['People', '/people', Users],
  ['Cards', '/cards', CreditCard],
  ['Events', '/events', CalendarDays],
  ['Budgets', '/budgets', WalletCards],
  ['Bills', '/bills', Bell],
  ['Analytics', '/analytics', ArrowUpRight],
  ['AI Assistant', '/ai', Sparkles]
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const email = user?.email || '';
  const logout = async () => { await signOut(); nav('/login', { replace: true }); };

  return (
    <div className="app">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand"><span className="logo">ƒ</span><span>finora</span><button className="close" onClick={() => setOpen(false)}><X /></button></div>
        <div className="family"><div className="avatar">{email.slice(0, 2).toUpperCase()}</div><div><b>Private workspace</b><small>Owner only</small></div></div>
        <nav>
          {NAV.map(([label, to, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>
              <Icon size={19} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings" onClick={() => setOpen(false)}><Settings size={19} />Settings</NavLink>
          <button className="user" onClick={logout}><div className="avatar purple">{email[0]?.toUpperCase() || 'U'}</div><div><b>{email}</b><small>Sign out</small></div></button>
        </div>
      </aside>
      <main>
        <header>
          <button className="menu" onClick={() => setOpen(true)}><Menu /></button>
          <div className="crumb"><span>Private finance</span></div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
