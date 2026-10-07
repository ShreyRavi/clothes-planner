import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { CommitInput } from '../components/CommitInput';
import { usePlanData } from '../hooks';
import { addSlot, moveSlot, setSlotHiddenIn, updateSlot } from '../../db/repo';
import { deleteWithUndo } from '../../db/actions';

/** SL-2 and SL-3: edit the plan's slots, and which ones show in this function. */
export function SlotsSheet({ planId, functionId }: { planId: string; functionId: string }) {
  const data = usePlanData(planId);
  const [name, setName] = useState('');
  if (!data) return null;
  const fn = data.functions.find((f) => f.id === functionId);
  return (
    <Sheet title="Edit slots" tall>
      <p className="meta" style={{ margin: 0 }}>
        Slots belong to the whole plan. Untick one to hide it in {fn?.name ?? 'this function'} only.
      </p>
      <div className="list-top">
        {data.slots.map((s, i) => (
          <div className="editor-row" key={s.id} style={{ flexWrap: 'wrap', paddingBottom: 6 }}>
            <label className="toggle" title={`Show in ${fn?.name}`}>
              <input type="checkbox" checked={!s.hiddenIn.includes(functionId)} onChange={(e) => setSlotHiddenIn(s.id, functionId, !e.target.checked)} aria-label={`Show ${s.name} in ${fn?.name}`} />
            </label>
            <CommitInput className="name" aria-label={`Slot ${i + 1} name`} value={s.name} onCommit={(v) => updateSlot(s.id, { name: v.trim() || s.name })} />
            <label className="toggle">
              <input type="checkbox" checked={s.optional} onChange={(e) => updateSlot(s.id, { optional: e.target.checked })} />
              Optional
            </label>
            <button className="btn btn-icon" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => moveSlot(planId, s.id, -1)}>
              ↑
            </button>
            <button className="btn btn-icon" aria-label={`Move ${s.name} down`} disabled={i === data.slots.length - 1} onClick={() => moveSlot(planId, s.id, 1)}>
              ↓
            </button>
            <button className="btn btn-icon" aria-label={`Delete ${s.name}`} onClick={() => deleteWithUndo('slot', s.id, `${s.name} deleted`)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <form
        className="field"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await addSlot(planId, name);
          setName('');
        }}
      >
        <label className="eyebrow" htmlFor="new-slot">
          Add a slot
        </label>
        <div className="row" style={{ gap: 8 }}>
          <input id="new-slot" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mehendi gloves" />
          <button className="btn" type="submit" disabled={!name.trim()}>
            Add
          </button>
        </div>
        <button
          type="button"
          className="btn-text"
          style={{ alignSelf: 'flex-start' }}
          disabled={!name.trim()}
          onClick={async () => {
            await addSlot(planId, name, functionId);
            setName('');
          }}
        >
          Add to {fn?.name ?? 'this function'} only
        </button>
      </form>
    </Sheet>
  );
}
