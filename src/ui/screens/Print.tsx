import { usePlanData } from '../hooks';
import { completeness, formatDate, formatPrice, slotStates } from '../../domain/stats';
import { ItemImage } from '../components/ItemImage';

/** PW-2: a print-friendly view of the whole plan. */
export function Print({ planId }: { planId: string }) {
  const data = usePlanData(planId);
  if (!data) return null;
  const items = new Map(data.items.map((i) => [i.id, i]));
  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <div className="row no-print">
        <a className="btn-plain" href={`#/p/${planId}`}>
          ‹ Back
        </a>
        <span className="spacer" />
        <button className="btn" onClick={() => print()}>
          Print
        </button>
      </div>
      <h1 className="title-1">{data.plan.title}</h1>
      {data.functions.map((fn) => {
        const c = completeness(data.slots, data.placements, fn.id);
        return (
          <section key={fn.id} className="stack" style={{ breakInside: 'avoid' }}>
            <h2 className="title-2">
              {fn.name} <span className="meta">{c.done} of {c.total}</span>
            </h2>
            <p className="meta" style={{ margin: 0 }}>
              {[formatDate(fn.date), fn.timeOfDay, fn.dressCode, fn.venueNotes].filter(Boolean).join(' · ')}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {slotStates(data.slots, data.placements, fn.id).map((s) => {
                  const item = s.picked ? items.get(s.picked.itemId) : undefined;
                  if (!item && s.slot.optional) return null;
                  return (
                    <tr key={s.slot.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '6px 0', width: 52 }}>
                        <span className="mini" style={{ display: 'block', position: 'relative' }}>
                          {item && <ItemImage item={item} label={false} />}
                        </span>
                      </td>
                      <td style={{ padding: 6, color: 'var(--muted)', width: '30%' }}>{s.slot.name}</td>
                      <td style={{ padding: 6 }}>{item ? item.title : <em className="muted">Not picked yet</em>}</td>
                      <td style={{ padding: 6 }}>{item?.status}</td>
                      <td style={{ padding: 6, textAlign: 'right' }} className="price">
                        {item ? formatPrice(item.price, item.currency) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </main>
  );
}
