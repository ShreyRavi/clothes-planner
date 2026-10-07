import { useEffect, useMemo, useState } from 'react';
import { usePlanData, type PlanData } from '../hooks';
import { TopBar } from '../components/TopBar';
import { NoticeBanner } from '../components/Banners';
import { FunctionCard } from '../components/FunctionCard';
import { ItemImage } from '../components/ItemImage';
import { FunctionDetail } from './FunctionDetail';
import { addFunction } from '../../db/repo';
import { openSheet } from '../../state/sheets';
import { setLastPlan } from '../../state/theme';
import { budget, completeness, formatDate, formatPrice } from '../../domain/stats';
import { DEFAULT_PRESETS } from '../../domain/presets';
import { navigate } from '../router';

export function PlanScreen({ planId, fnId }: { planId: string; fnId?: string }) {
  const data = usePlanData(planId);
  useEffect(() => {
    if (data) setLastPlan(planId);
  }, [data, planId]);

  if (data === undefined) return <TopBar />;
  if (data === null) {
    return (
      <>
        <TopBar />
        <main className="page">
          <h1 className="title-1">This plan isn't on this device</h1>
          <p className="muted">It may have been deleted. Your other plans are on the home screen.</p>
          <a className="btn btn-primary" href="#/">
            Go to home
          </a>
        </main>
      </>
    );
  }
  const fnExists = fnId && data.functions.some((f) => f.id === fnId);
  return (
    <>
      <TopBar planId={planId} planTitle={data.plan.title} />
      <NoticeBanner showBackup />
      <div className={`plan-shell split${fnExists ? ' detail-open' : ''}`}>
        <Overview data={data} selectedFn={fnExists ? fnId : undefined} />
        <div className="pane-detail">
          {fnExists ? (
            <FunctionDetail data={data} fnId={fnId!} />
          ) : (
            <div className="detail-inner" style={{ paddingTop: 80 }}>
              <p className="muted serif" style={{ fontSize: 22, textAlign: 'center' }}>
                {data.functions.length ? 'Choose a function to plan its outfit.' : 'Add a function to start planning.'}
              </p>
            </div>
          )}
        </div>
      </div>
      {data.functions.length > 0 && (
        <button className="fab no-print" aria-label="Add an item" onClick={() => openSheet({ kind: 'capture', planId })}>
          +
        </button>
      )}
    </>
  );
}

function Overview({ data, selectedFn }: { data: PlanData; selectedFn?: string }) {
  const { plan, functions, slots, items, placements } = data;
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const inbox = useMemo(() => {
    const placed = new Set(placements.map((p) => p.itemId));
    return items.filter((i) => !placed.has(i.id)).sort((a, b) => b.createdAt - a.createdAt);
  }, [items, placements]);
  const totals = functions.reduce(
    (acc, f) => {
      const c = completeness(slots, placements, f.id);
      return { done: acc.done + c.done, total: acc.total + c.total };
    },
    { done: 0, total: 0 },
  );
  const range = [formatDate(plan.startDate), formatDate(plan.endDate)].filter(Boolean).join(' to ');
  const money = budget(items, placements);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const submitFunction = async () => {
    const id = await addFunction(plan.id, newName);
    setAdding(false);
    setNewName('');
    navigate(`/p/${plan.id}/f/${id}`);
  };

  return (
    <div className="pane-overview">
      <div className="stack" style={{ gap: 6, padding: '0 4px' }}>
        <span className="eyebrow">{[plan.owner && `${plan.owner}'s plan`, DEFAULT_PRESETS[plan.preset].label].filter(Boolean).join(' · ')}</span>
        <h1 className="title-1">{plan.title}</h1>
        <span className="muted" style={{ fontSize: 14 }}>
          {[plan.place, range, totals.total ? `${totals.done} of ${totals.total} slots picked` : ''].filter(Boolean).join('  ·  ')}
        </span>
        {money.length > 0 && (
          <span className="meta price">Picked so far: {money.map((m) => formatPrice(m.total, m.currency)).join(' + ')}</span>
        )}
        {plan.sharedOn && <span className="meta">Saved from a link shared on {plan.sharedOn}</span>}
      </div>
      <div className="row no-print" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => openSheet({ kind: 'share', planId: plan.id })} disabled={!functions.length}>
          Share
        </button>
        <a className="btn" href={`#/p/${plan.id}/lists`}>
          Shopping and packing
        </a>
      </div>
      {inbox.length > 0 && (
        <a className="inbox-row" href={`#/p/${plan.id}/inbox`}>
          <span className="thumbs" aria-hidden="true">
            {inbox.slice(0, 3).map((it) => (
              <span className="mini" key={it.id}>
                <ItemImage item={it} label={false} />
              </span>
            ))}
          </span>
          <span style={{ flex: 1 }}>
            {inbox.length} item{inbox.length === 1 ? '' : 's'} to place
          </span>
          <span className="muted" aria-hidden="true">
            ›
          </span>
        </a>
      )}
      {functions.length ? (
        <div className="stack" style={{ gap: 12 }}>
          {functions.map((fn) => (
            <FunctionCard key={fn.id} fn={fn} slots={slots} placements={placements} items={itemMap} selected={fn.id === selectedFn} href={`#/p/${plan.id}/f/${fn.id}`} />
          ))}
        </div>
      ) : (
        <div className="empty-box">
          <span className="serif" style={{ fontSize: 22 }}>
            No functions yet
          </span>
          <span className="muted" style={{ fontSize: 14 }}>
            Add one for each occasion you're dressing for.
          </span>
        </div>
      )}
      {adding ? (
        <form
          className="row no-print"
          onSubmit={(e) => {
            e.preventDefault();
            void submitFunction();
          }}
        >
          <input className="input" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Cocktail night" aria-label="Function name" />
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      ) : (
        <button className="btn no-print" style={{ minHeight: 48 }} onClick={() => setAdding(true)}>
          + Add function
        </button>
      )}
    </div>
  );
}
