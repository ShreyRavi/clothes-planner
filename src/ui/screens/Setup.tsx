import { useMemo, useState } from 'react';
import { TEMPLATES, templateById } from '../../domain/templates';
import { DEFAULT_PRESETS, PRESET_IDS } from '../../domain/presets';
import { createPlan, updatePlan } from '../../db/repo';
import { navigate } from '../router';
import { requestPersistence } from '../actions';
import type { PresetId } from '../../domain/types';

const PRESET_DESC: Record<PresetId, string> = {
  women: 'Main outfit, blouse, dupatta, footwear, jewelry, bag, plus optional hair, makeup and tailoring.',
  men: 'Main outfit, bottoms, jacket, footwear, safa, stole, accessories, plus optional grooming and tailoring.',
  custom: 'Four simple slots to start. Add, rename or remove any of them later.',
};

export function Setup({ templateId }: { templateId: string }) {
  const [tplId, setTplId] = useState(templateById(templateId) ? templateId : 'indian-wedding');
  const tpl = templateById(tplId)!;
  const [owner, setOwner] = useState('');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [preset, setPreset] = useState<PresetId>('women');
  const [off, setOff] = useState<Set<string>>(new Set());
  const [optOn, setOptOn] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const chosen = useMemo(
    () => [...tpl.functions.filter((f) => !off.has(f.name)), ...tpl.optional.filter((f) => optOn.has(f.name))],
    [tpl, off, optOn],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, name: string) => {
    const next = new Set(set);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setter(next);
  };

  const create = async () => {
    setBusy(true);
    try {
      const id = await createPlan({ title: title || `${owner ? `${owner}'s ` : ''}${tpl.name === 'Blank' ? 'plan' : tpl.name.toLowerCase()}`, owner, preset, templateId: tpl.id, functions: chosen });
      if (place.trim()) await updatePlan(id, { place: place.trim() });
      void requestPersistence();
      navigate(`/p/${id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className="row topbar-plain">
        <a className="btn-plain" href="#/">
          ‹ Back
        </a>
        <span className="spacer" />
        <span className="wordmark" style={{ fontSize: 20 }}>
          Trousseau
        </span>
        <span className="spacer" />
        <span style={{ width: 52 }} />
      </div>
      <h1 className="title-1" style={{ fontSize: 38 }}>
        New plan
      </h1>
      <div className="stack">
        <span className="eyebrow" id="tpl-label">
          Template
        </span>
        <div className="chips" role="group" aria-labelledby="tpl-label">
          {TEMPLATES.map((t) => (
            <button key={t.id} className="chip" aria-pressed={t.id === tplId} onClick={() => { setTplId(t.id); setOff(new Set()); setOptOn(new Set()); }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="eyebrow">Whose plan is this</span>
        <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Your name" autoComplete="given-name" />
      </label>
      <div className="field">
        <label className="eyebrow" htmlFor="event">
          Event
        </label>
        <input id="event" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Riya and Kabir's wedding" />
        <input className="input" aria-label="Where and when" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Where and when, e.g. Udaipur, Dec 12 to 15" />
      </div>
      <div className="stack">
        <span className="eyebrow" id="preset-label">
          Slots for each outfit
        </span>
        <div className="segmented" role="group" aria-labelledby="preset-label">
          {PRESET_IDS.map((p) => (
            <button key={p} aria-pressed={p === preset} onClick={() => setPreset(p)}>
              {DEFAULT_PRESETS[p].label}
            </button>
          ))}
        </div>
        <p className="meta" style={{ margin: 0 }}>
          {PRESET_DESC[preset]}
        </p>
      </div>
      <div className="stack">
        <span className="eyebrow">Functions</span>
        {tpl.functions.length > 0 && (
          <div className="list-top">
            {tpl.functions.map((f) => (
              <button key={f.name} className="check-row" role="checkbox" aria-checked={!off.has(f.name)} onClick={() => toggle(off, setOff, f.name)}>
                <span className="check-box">{!off.has(f.name) ? '✓' : ''}</span>
                <span style={{ flex: 1 }}>{f.name}</span>
                <span className="meta">{f.timeOfDay}</span>
              </button>
            ))}
          </div>
        )}
        {tpl.optional.length > 0 && (
          <>
            <span className="meta" style={{ marginTop: 14 }}>
              Add any of these if they're happening
            </span>
            <div className="list-top">
              {tpl.optional.map((f) => (
                <button key={f.name} className="check-row" role="checkbox" aria-checked={optOn.has(f.name)} onClick={() => toggle(optOn, setOptOn, f.name)}>
                  <span className="check-box">{optOn.has(f.name) ? '✓' : ''}</span>
                  <span style={{ flex: 1 }}>{f.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {tpl.functions.length === 0 && <p className="meta">You can add functions after you create the plan.</p>}
      </div>
      <div style={{ position: 'sticky', bottom: 0, padding: '16px 0 20px', background: 'linear-gradient(to top, var(--bg) 70%, transparent)' }}>
        <button className="btn btn-primary btn-block" onClick={create} disabled={busy}>
          {chosen.length ? `Create plan with ${chosen.length} function${chosen.length === 1 ? '' : 's'}` : 'Create plan'}
        </button>
      </div>
    </main>
  );
}
