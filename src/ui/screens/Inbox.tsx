import { useMemo, useRef } from 'react';
import { usePlanData } from '../hooks';
import { TopBar } from '../components/TopBar';
import { NoticeBanner } from '../components/Banners';
import { ItemImage } from '../components/ItemImage';
import { openSheet } from '../../state/sheets';
import { hostOf } from '../../domain/safeUrl';

function ago(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d} days ago`;
}

/** Inbox: unplaced items with a Place button on every row (DR6, DR10). */
export function Inbox({ planId }: { planId: string }) {
  const data = usePlanData(planId);
  const hadItems = useRef(false);
  const inbox = useMemo(() => {
    if (!data) return [];
    const placed = new Set(data.placements.map((p) => p.itemId));
    return data.items.filter((i) => !placed.has(i.id)).sort((a, b) => b.createdAt - a.createdAt);
  }, [data]);
  if (inbox.length) hadItems.current = true;
  if (!data) return <TopBar />;
  return (
    <>
      <TopBar planId={planId} planTitle={data.plan.title} />
      <NoticeBanner showBackup={false} />
      <main className="page" style={{ gap: 16 }}>
        <a className="btn-plain" href={`#/p/${planId}`} style={{ alignSelf: 'flex-start' }}>
          ‹ {data.plan.title}
        </a>
        <div className="stack" style={{ gap: 2 }}>
          <h1 className="title-1">Inbox</h1>
          {inbox.length > 0 && (
            <span className="meta">
              {inbox.length} item{inbox.length === 1 ? '' : 's'} to place
            </span>
          )}
        </div>
        {inbox.length === 0 ? (
          <div className="stack" style={{ gap: 12 }}>
            <h2 className="title-3">{hadItems.current ? 'All placed' : 'Nothing to place'}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 15 }}>
              Things you save without choosing a slot wait here.
            </p>
            {data.functions.length > 0 && (
              <button className="btn" style={{ minHeight: 56, alignSelf: 'flex-start' }} onClick={() => openSheet({ kind: 'capture', planId })}>
                Add an item
              </button>
            )}
          </div>
        ) : (
          <div className="list-top">
            {inbox.map((item) => (
              <div className="inbox-item" key={item.id}>
                <button className="open" onClick={() => openSheet({ kind: 'item', planId, itemId: item.id })}>
                  <span className="photo">
                    <ItemImage item={item} label={false} />
                  </span>
                  <span className="txt">
                    <strong>{item.title}</strong>
                    <span className="meta">{[hostOf(item.link), ago(item.createdAt)].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
                <button className="btn" disabled={!data.functions.length} onClick={() => openSheet({ kind: 'place', planId, itemId: item.id })}>
                  Place
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
