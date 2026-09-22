import { Sparkles } from 'lucide-react';

export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <section className="page empty">
      <div className="empty-icon"><Sparkles /></div>
      <p className="eyebrow">COMING NEXT</p>
      <h1>{title}</h1>
      <p className="sub">{note || 'This module is planned. The transaction ledger already powers the data it will use.'}</p>
    </section>
  );
}
