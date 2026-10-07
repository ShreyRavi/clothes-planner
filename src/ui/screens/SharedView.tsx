import { useEffect, useMemo, useState } from 'react';
import { CodecError, decodePlan, type DecodedShare } from '../../codec/codec';
import { restoreSnapshot } from '../../db/undo';
import { write } from '../../db/write';
import { db } from '../../db/schema';
import { completeness, formatDate, formatPrice, slotStates } from '../../domain/stats';
import { DEFAULT_PRESETS } from '../../domain/presets';
import { ItemImage } from '../components/ItemImage';
import { CantOpen } from './CantOpen';

const appHome = import.meta.env.BASE_URL;

function readHash(): { ok: true; share: DecodedShare } | { ok: false; reason: string; detail: string } {
  try {
    return { ok: true, share: decodePlan(location.hash) };
  } catch (e) {
    if (e instanceof CodecError) return { ok: false, reason: e.reason, detail: e.message };
    return { ok: false, reason: 'invalid', detail: String(e) };
  }
}

/** SH-2: the read-only page a recipient sees, with a shared-on date and Save a copy. */
export function SharedView() {
  const [state, setState] = useState(readHash);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const on = () => setState(readHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (state.ok) document.title = `${state.share.snapshot.plans[0].title} · Trousseau`;
  }, [state]);

  const view = useMemo(() => {
    if (!state.ok) return null;
    const s = state.share.snapshot;
    return { plan: s.plans[0], functions: s.functions, slots: s.slots, items: new Map(s.items.map((i) => [i.id, i])), placements: s.placements };
  }, [state]);

  if (!state.ok || !view) return <CantOpen reason={state.ok ? 'invalid' : state.reason} detail={state.ok ? '' : state.detail} home={`${appHome}#/new`} />;
  const { plan, functions, slots, items, placements } = view;
  const sharedOn = state.share.sharedOn;

  const saveCopy = async () => {
    setSaving(true);
    try {
      const existing = new Set((await db.plans.toArray()).map((p) => p.title));
      const snap = state.share.snapshot;
      const copy = { ...snap, plans: snap.plans.map((p) => ({ ...p, sharedOn, title: existing.has(p.title) ? `Copy of ${p.title}` : p.title })) };
      await write(() => restoreSnapshot(copy));
      location.href = `${appHome}#/p/${copy.plans[0].id}`;
    } catch {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="topbar">
        <a className="wordmark" href={appHome}>
          Trousseau
        </a>
        <span className="spacer" />
        <span className="meta">Read only</span>
      </header>
      <main className="page" style={{ gap: 24 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">{[plan.owner && `${plan.owner}'s plan`, DEFAULT_PRESETS[plan.preset].label].filter(Boolean).join(' · ')}</span>
          <h1 className="title-1">{plan.title}</h1>
          <span className="muted" style={{ fontSize: 14 }}>
            {[plan.place, [formatDate(plan.startDate), formatDate(plan.endDate)].filter(Boolean).join(' to ')].filter(Boolean).join(' · ')}
          </span>
          {sharedOn && <span className="meta">Shared on {formatDate(sharedOn) || sharedOn}. Later changes by the sender are not in this link.</span>}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <button className="btn btn-primary btn-block" onClick={saveCopy} disabled={saving}>
            Save a copy
          </button>
          <a className="btn-text" style={{ alignSelf: 'center' }} href={`${appHome}#/new`}>
            Start your own plan
          </a>
        </div>
        {functions.map((fn) => {
          const c = completeness(slots, placements, fn.id);
          return (
            <section key={fn.id} className="stack" style={{ gap: 4 }} aria-label={fn.name}>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <h2 className="title-2" style={{ flex: 1 }}>
                  {fn.name}
                </h2>
                <span className="count" style={{ fontWeight: 600 }}>
                  {c.done} of {c.total}
                </span>
              </div>
              <span className="meta">{[formatDate(fn.date), fn.timeOfDay, fn.dressCode].filter(Boolean).join(' · ')}</span>
              {fn.venueNotes && <span className="meta">{fn.venueNotes}</span>}
              <div className="list-top" style={{ marginTop: 8 }}>
                {slotStates(slots, placements, fn.id).map((s) => {
                  const item = s.picked ? items.get(s.picked.itemId) : undefined;
                  if (!item && s.slot.optional && !s.placements.length) return null;
                  const alternatives = s.placements.filter((p) => !p.picked).length;
                  return (
                    <div className="list-line" key={s.slot.id} style={{ minHeight: 76, alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
                      <span className="mini" style={{ width: 52, height: 64, flexBasis: 52, position: 'relative', ...(item ? {} : { background: 'transparent', border: '1.5px dashed var(--line)' }) }}>
                        {item && <ItemImage item={item} label={false} />}
                      </span>
                      <span className="txt" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className="eyebrow" style={{ fontSize: 11 }}>
                          {s.slot.name}
                        </span>
                        {item ? (
                          <>
                            {item.link ? (
                              <a href={item.link} target="_blank" rel="noopener noreferrer nofollow">
                                {item.title}
                              </a>
                            ) : (
                              <span>{item.title}</span>
                            )}
                            <span className="meta">{[item.status, formatPrice(item.price, item.currency), alternatives ? `${alternatives} other option${alternatives === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}</span>
                            {item.note && <span className="meta">{item.note}</span>}
                          </>
                        ) : (
                          <span className="muted">{alternatives ? `${alternatives} option${alternatives === 1 ? '' : 's'}, none picked` : 'Not picked yet'}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="meta">Photos taken on the sender's phone don't travel in links, so some pieces may show only a name.</p>
      </main>
    </>
  );
}
