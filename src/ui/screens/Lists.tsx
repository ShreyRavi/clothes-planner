import { useMemo, useState } from 'react';
import { usePlanData } from '../hooks';
import { TopBar } from '../components/TopBar';
import { ItemImage } from '../components/ItemImage';
import { setStatus } from '../../db/repo';
import { formatPrice } from '../../domain/stats';
import { openSheet } from '../../state/sheets';
import type { Item, Status } from '../../domain/types';

const SHOPPING: Status[] = ['Idea', 'To buy', 'Ordered', 'At tailor'];

/** VW-2: shopping and packing across every function, by status. */
export function Lists({ planId }: { planId: string }) {
  const data = usePlanData(planId);
  const [tab, setTab] = useState<'shopping' | 'packing'>('shopping');
  const picked = useMemo(() => {
    if (!data) return [] as Array<{ item: Item; fns: string[] }>;
    const fnName = new Map(data.functions.map((f) => [f.id, f.name]));
    const byItem = new Map<string, string[]>();
    for (const p of data.placements) if (p.picked) byItem.set(p.itemId, [...(byItem.get(p.itemId) ?? []), fnName.get(p.functionId) ?? '']);
    return data.items.filter((i) => byItem.has(i.id)).map((item) => ({ item, fns: byItem.get(item.id)! }));
  }, [data]);
  if (!data) return <TopBar />;

  const groups: Array<[string, typeof picked]> =
    tab === 'shopping'
      ? SHOPPING.map((s) => [s, picked.filter((p) => p.item.status === s)] as [string, typeof picked]).filter(([, l]) => l.length)
      : [
          ['To pack', picked.filter((p) => p.item.status === 'Ready')],
          ['Packed', picked.filter((p) => p.item.status === 'Packed')],
        ];
  const notReady = picked.filter((p) => SHOPPING.includes(p.item.status)).length;

  return (
    <>
      <TopBar planId={planId} planTitle={data.plan.title} />
      <main className="page" style={{ gap: 18 }}>
        <a className="btn-plain" href={`#/p/${planId}`} style={{ alignSelf: 'flex-start' }}>
          ‹ {data.plan.title}
        </a>
        <h1 className="title-1">{tab === 'shopping' ? 'Shopping' : 'Packing'}</h1>
        <div className="segmented" role="group" aria-label="List">
          <button aria-pressed={tab === 'shopping'} onClick={() => setTab('shopping')}>
            Shopping
          </button>
          <button aria-pressed={tab === 'packing'} onClick={() => setTab('packing')}>
            Packing
          </button>
        </div>
        {picked.length === 0 && <p className="muted">Pick items in your functions and they show up here.</p>}
        {tab === 'packing' && notReady > 0 && <p className="meta">{notReady} picked item{notReady === 1 ? ' is' : 's are'} not ready yet. Mark them Ready to add them here.</p>}
        {groups.map(([label, list]) => (
          <section key={label} className="list-group" aria-label={label}>
            <h2 className="eyebrow">
              {label} <span className="num">({list.length})</span>
            </h2>
            {list.map(({ item, fns }) => (
              <div className="list-line" key={item.id}>
                {tab === 'packing' && (
                  <input
                    type="checkbox"
                    aria-label={`${item.title} packed`}
                    checked={item.status === 'Packed'}
                    onChange={(e) => setStatus(item.id, e.target.checked ? 'Packed' : 'Ready')}
                    style={{ width: 22, height: 22, accentColor: 'var(--accent)' }}
                  />
                )}
                <span className="mini" style={{ position: 'relative' }}>
                  <ItemImage item={item} label={false} />
                </span>
                <button className="txt btn-plain" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => openSheet({ kind: 'item', planId, itemId: item.id })}>
                  <span>{item.title}</span>
                  <span className="meta">{fns.join(', ')}</span>
                </button>
                <span className="meta price">{formatPrice(item.price, item.currency)}</span>
              </div>
            ))}
          </section>
        ))}
        <a className="btn-text" href={`#/p/${planId}/print`} style={{ alignSelf: 'flex-start' }}>
          Print the whole plan
        </a>
      </main>
    </>
  );
}
