import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { DEFAULT_PRESETS } from '../../domain/presets';
import { savePreset } from '../../db/repo';
import { showToast } from '../../state/store';
import type { Preset, PresetId, PresetSlot } from '../../domain/types';

/** Preset editor: reorder with drag or Move buttons, rename, optional, add, reset (DR4, DR15). */
export function PresetEditor({ presetId }: { presetId: string }) {
  const id = (['women', 'men', 'custom'].includes(presetId) ? presetId : 'women') as PresetId;
  const stored = useLiveQuery(() => db.presets.get(id), [id]);
  const preset: Preset = stored ?? DEFAULT_PRESETS[id];
  const [slots, setSlots] = useState<PresetSlot[]>(preset.slots);
  const dragFrom = useRef<number | null>(null);
  useEffect(() => setSlots(preset.slots), [stored]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next: PresetSlot[]) => {
    setSlots(next);
    void savePreset({ ...preset, slots: next });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <main className="page" style={{ gap: 20 }}>
      <div className="row topbar-plain">
        <a className="btn-plain" href="#/settings">
          ‹ Settings
        </a>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="title-1">{preset.label} slots</h1>
        <p className="meta" style={{ margin: 0 }}>
          Changes apply to new plans only.
        </p>
      </div>
      {slots.length === 0 && <p className="muted">No slots yet</p>}
      <div className="list-top">
        {slots.map((s, i) => (
          <div
            className="editor-row"
            key={`${i}-${s.name}`}
            draggable
            onDragStart={() => (dragFrom.current = i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const from = dragFrom.current;
              dragFrom.current = null;
              if (from === null || from === i) return;
              const next = [...slots];
              const [m] = next.splice(from, 1);
              next.splice(i, 0, m);
              commit(next);
            }}
          >
            <span className="drag" aria-hidden="true">
              ⋮⋮
            </span>
            <input
              className="name"
              aria-label={`Slot ${i + 1} name`}
              defaultValue={s.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) commit(slots.map((x, k) => (k === i ? { ...x, name: v } : x)));
              }}
            />
            <label className="toggle">
              <input type="checkbox" checked={s.optional} onChange={(e) => commit(slots.map((x, k) => (k === i ? { ...x, optional: e.target.checked } : x)))} />
              Optional
            </label>
            <button className="btn btn-icon" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button className="btn btn-icon" aria-label={`Move ${s.name} down`} disabled={i === slots.length - 1} onClick={() => move(i, 1)}>
              ↓
            </button>
            <button
              className="btn btn-icon"
              aria-label={`Remove ${s.name}`}
              onClick={() => {
                const before = slots;
                commit(slots.filter((_, k) => k !== i));
                showToast(`${s.name} removed`, () => commit(before));
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => commit([...slots, { name: 'New slot', hint: '', optional: false }])}>
        + Add slot
      </button>
      <button
        className="btn-text"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          const before = slots;
          commit(structuredClone(DEFAULT_PRESETS[id].slots));
          showToast(`${preset.label} reset to default`, () => commit(before));
        }}
      >
        Reset to default
      </button>
    </main>
  );
}
