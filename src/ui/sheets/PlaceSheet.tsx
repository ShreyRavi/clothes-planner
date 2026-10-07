import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from '../components/Sheet';
import { ItemImage } from '../components/ItemImage';
import { usePlanData } from '../hooks';
import { db } from '../../db/schema';
import { getLastUsed, moveItemTo, placeItem } from '../../db/repo';
import { slotsForFunction } from '../../domain/stats';
import { closeSheet } from '../../state/sheets';
import { showToast } from '../../state/store';

/**
 * Place sheet. After capture the item is already saved (to the last used slot or
 * the Inbox); this lets the person confirm, change, or send it to the Inbox.
 */
export function PlaceSheet({ planId, itemId, justCaptured, addOnly }: { planId: string; itemId: string; justCaptured?: boolean; addOnly?: boolean }) {
  const data = usePlanData(planId);
  const item = data?.items.find((i) => i.id === itemId);
  const current = useLiveQuery(() => db.placements.where('itemId').equals(itemId).toArray(), [itemId]);
  const [fnId, setFnId] = useState('');
  const [slotId, setSlotId] = useState('');

  useEffect(() => {
    if (!data || !current || fnId) return;
    (async () => {
      const here = !addOnly && current.length === 1 ? current[0] : null;
      const last = await getLastUsed(planId);
      const f = here?.functionId ?? last?.functionId ?? data.functions[0]?.id ?? '';
      const s = here?.slotId ?? last?.slotId ?? (f ? slotsForFunction(data.slots, f)[0]?.id : '') ?? '';
      setFnId(f);
      setSlotId(s);
    })();
  }, [data, current, fnId, planId, addOnly]);

  const slotOptions = useMemo(() => (data && fnId ? slotsForFunction(data.slots, fnId) : []), [data, fnId]);
  useEffect(() => {
    if (slotOptions.length && !slotOptions.some((s) => s.id === slotId)) setSlotId(slotOptions[0].id);
  }, [slotOptions, slotId]);

  if (!data || !item || !current) return null;
  const fnName = (id: string) => data.functions.find((f) => f.id === id)?.name ?? '';
  const slotName = (id: string) => data.slots.find((s) => s.id === id)?.name ?? '';
  const savedTo = current.length === 1 ? `${fnName(current[0].functionId)}, ${slotName(current[0].slotId)}` : current.length ? `${current.length} places` : 'Inbox';

  const done = async () => {
    if (!fnId || !slotId) return closeSheet();
    if (addOnly) {
      await placeItem(itemId, fnId, slotId);
      showToast(`Also in ${fnName(fnId)}, ${slotName(slotId)}`);
    } else {
      const same = current.length === 1 && current[0].functionId === fnId && current[0].slotId === slotId;
      if (!same) await moveItemTo(itemId, { functionId: fnId, slotId });
      showToast(`Saved to ${fnName(fnId)}, ${slotName(slotId)}`);
    }
    closeSheet();
  };

  return (
    <Sheet title={addOnly ? 'Use in another function' : justCaptured ? 'Saved' : 'Place item'}>
      <div className="row">
        <span className="mini" style={{ width: 56, height: 70, flexBasis: 56, position: 'relative' }}>
          <ItemImage item={item} label={false} />
        </span>
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <strong style={{ fontWeight: 600 }}>{item.title}</strong>
          {!addOnly && <span className="meta">Saved to {savedTo}</span>}
        </div>
      </div>
      {data.functions.length === 0 ? (
        <p className="muted">Add a function to the plan first; until then this item waits in the Inbox.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
          <label className="field">
            <span className="eyebrow">Function</span>
            <select className="select" value={fnId} onChange={(e) => setFnId(e.target.value)}>
              {data.functions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="eyebrow">Slot</span>
            <select className="select" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              {slotOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <button className="btn btn-primary btn-block" onClick={done} disabled={!data.functions.length}>
        {addOnly ? 'Add here' : 'Done'}
      </button>
      {!addOnly && current.length > 0 && (
        <button
          className="btn-text"
          style={{ alignSelf: 'center' }}
          onClick={async () => {
            await moveItemTo(itemId, null);
            showToast('Moved to Inbox');
            closeSheet();
          }}
        >
          Move to Inbox
        </button>
      )}
    </Sheet>
  );
}
