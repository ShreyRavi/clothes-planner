import { useMemo } from 'react';
import type { PlanData } from '../hooks';
import { CommitInput } from '../components/CommitInput';
import { ItemImage } from '../components/ItemImage';
import { StatusChip, nextStatus } from '../components/StatusChip';
import { swatchFor } from '../components/FunctionCard';
import { completeness, slotStates } from '../../domain/stats';
import { moveFunction, setStatus, togglePick, updateFunction } from '../../db/repo';
import { deleteWithUndo } from '../../db/actions';
import { openSheet } from '../../state/sheets';
import { navigate } from '../router';
import type { Fn } from '../../domain/types';

export function FunctionDetail({ data, fnId }: { data: PlanData; fnId: string }) {
  const { plan, functions, slots, items, placements } = data;
  const fn = functions.find((f) => f.id === fnId)!;
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const states = slotStates(slots, placements, fn.id);
  const c = completeness(slots, placements, fn.id);
  const index = functions.findIndex((f) => f.id === fn.id);
  const save = (patch: Partial<Fn>) => updateFunction(fn.id, patch);

  return (
    <div className="detail-inner">
      <a className="btn-plain only-narrow" href={`#/p/${plan.id}`} style={{ alignSelf: 'flex-start' }}>
        ‹ All functions
      </a>
      <div className="stack" style={{ gap: 14, paddingTop: 8 }}>
        <div className="row">
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: swatchFor(fn.name), flexShrink: 0 }} aria-hidden="true" />
          <CommitInput
            aria-label="Function name"
            value={fn.name}
            onCommit={(v) => save({ name: v.trim() || fn.name })}
            className="serif"
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 38, lineHeight: 1.1, padding: 0 }}
          />
        </div>
        <div className="field-grid">
          <label>
            <span className="mono-label">Date</span>
            <CommitInput type="date" value={fn.date} onCommit={(v) => save({ date: v })} />
          </label>
          <label>
            <span className="mono-label">Time</span>
            <CommitInput value={fn.timeOfDay} onCommit={(v) => save({ timeOfDay: v })} placeholder="Evening" />
          </label>
          <label>
            <span className="mono-label">Dress code</span>
            <CommitInput value={fn.dressCode} onCommit={(v) => save({ dressCode: v })} placeholder="Jewel tones" />
          </label>
          <label>
            <span className="mono-label">Color theme</span>
            <CommitInput value={fn.colorTheme} onCommit={(v) => save({ colorTheme: v })} placeholder="Greens and gold" />
          </label>
          <label className="wide">
            <span className="mono-label">Venue notes</span>
            <CommitInput value={fn.venueNotes} onCommit={(v) => save({ venueNotes: v })} placeholder="Garden lawn, heels sink" />
          </label>
        </div>
        <div className="row" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span className="count" style={{ fontSize: 15, fontWeight: 600 }}>
            {c.done} of {c.total} picked
          </span>
          {c.missing.length > 0 ? (
            <span style={{ fontSize: 14, color: 'var(--accent)' }}>
              Missing: {c.missing.map((s) => s.name).join(', ')}
            </span>
          ) : c.total > 0 ? (
            <span className="muted" style={{ fontSize: 14 }}>
              Every slot has a pick
            </span>
          ) : null}
        </div>
      </div>

      <div className="list-top">
        {states.map(({ slot, placements: ps, picked }) => {
          const status = picked ? 'Picked' : ps.length ? `${ps.length} to choose from` : slot.optional ? 'Optional' : 'Missing';
          const markClass = picked ? 'done' : slot.optional ? 'optional' : ps.length ? '' : 'missing';
          const target = { functionId: fn.id, slotId: slot.id };
          return (
            <section className="slot-row" key={slot.id} aria-label={`${slot.name}: ${status}`}>
              <div className="slot-head">
                <span className={`slot-mark ${markClass}`} aria-hidden="true">
                  {picked ? '✓' : ''}
                </span>
                <span className="slot-name">{slot.name}</span>
                <span className={`slot-status${status === 'Missing' ? ' missing' : ''}`}>{status}</span>
              </div>
              <div className="strip">
                {ps.map((p) => {
                  const item = itemMap.get(p.itemId);
                  if (!item) return null;
                  return (
                    <div className="tile" key={p.id}>
                      <button
                        className="tile-img"
                        aria-pressed={p.picked}
                        aria-label={`${item.title}${p.picked ? ', picked. Tap to unpick' : '. Tap to pick'}`}
                        onClick={() => togglePick(p.id)}
                      >
                        <ItemImage item={item} />
                        {p.picked && (
                          <span className="tile-check" aria-hidden="true">
                            ✓
                          </span>
                        )}
                      </button>
                      <button className="tile-title" onClick={() => openSheet({ kind: 'item', planId: plan.id, itemId: item.id, placementId: p.id })}>
                        {item.title}
                      </button>
                      {p.picked && <StatusChip status={item.status} onCycle={() => setStatus(item.id, nextStatus(item.status))} />}
                    </div>
                  );
                })}
                <button className={`tile-add${status === 'Missing' ? ' missing' : ''}`} onClick={() => openSheet({ kind: 'capture', planId: plan.id, target })} aria-label={`Add to ${slot.name}`}>
                  <span className="plus" aria-hidden="true">
                    +
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Add</span>
                  {slot.hint && <span className="hint">{slot.hint}</span>}
                </button>
                {items.length > 0 && (
                  <button className="tile-add" onClick={() => openSheet({ kind: 'useExisting', planId: plan.id, ...target })} aria-label={`Use an existing item for ${slot.name}`}>
                    <span className="plus" aria-hidden="true">
                      ⤶
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Use existing</span>
                  </button>
                )}
              </div>
            </section>
          );
        })}
        {states.length === 0 && (
          <div className="empty-box" style={{ marginTop: 16 }}>
            <span className="serif" style={{ fontSize: 20 }}>
              No slots for this function
            </span>
            <button className="btn" onClick={() => openSheet({ kind: 'slots', planId: plan.id, functionId: fn.id })}>
              Edit slots
            </button>
          </div>
        )}
      </div>

      <div className="row no-print" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={() => openSheet({ kind: 'share', planId: plan.id, functionId: fn.id })}>
          Share this function
        </button>
        <button className="btn" onClick={() => openSheet({ kind: 'slots', planId: plan.id, functionId: fn.id })}>
          Edit slots
        </button>
      </div>
      <div className="row no-print" style={{ flexWrap: 'wrap', gap: 4 }}>
        <button className="btn-text" disabled={index <= 0} onClick={() => moveFunction(plan.id, fn.id, -1)}>
          Move earlier
        </button>
        <button className="btn-text" disabled={index >= functions.length - 1} onClick={() => moveFunction(plan.id, fn.id, 1)}>
          Move later
        </button>
        <span className="spacer" />
        <button
          className="btn-text muted"
          onClick={async () => {
            navigate(`/p/${plan.id}`, { replace: true });
            await deleteWithUndo('function', fn.id, `${fn.name} deleted`);
          }}
        >
          Delete this function
        </button>
      </div>
    </div>
  );
}
