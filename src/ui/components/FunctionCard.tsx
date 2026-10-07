import { completeness, formatDate, slotStates } from '../../domain/stats';
import type { Fn, Item, Placement, Slot } from '../../domain/types';
import { ItemImage } from './ItemImage';

export function swatchFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `oklch(0.72 0.09 ${h})`;
}

export function FunctionCard(props: { fn: Fn; slots: Slot[]; placements: Placement[]; items: Map<string, Item>; selected?: boolean; href: string }) {
  const { fn, slots, placements, items } = props;
  const c = completeness(slots, placements, fn.id);
  const states = slotStates(slots, placements, fn.id);
  const picked = states.filter((s) => s.picked).map((s) => items.get(s.picked!.itemId)).filter(Boolean) as Item[];
  const when = [formatDate(fn.date), fn.timeOfDay].filter(Boolean).join(' · ');
  return (
    <a className="fn-card" href={props.href} aria-current={props.selected ? 'true' : undefined}>
      <span className="head">
        <span className="swatch" style={{ background: swatchFor(fn.name) }} aria-hidden="true" />
        <span className="name">{fn.name}</span>
        <span className="count" aria-label={`${c.done} of ${c.total} picked`}>
          {c.done} of {c.total}
        </span>
      </span>
      <span className="sub">
        <span>{when || 'Add a date'}</span>
        {c.missing.length ? <span className="missing">{c.missing.length} missing</span> : c.total ? <span className="complete">Complete</span> : null}
      </span>
      <span className="thumbs" aria-hidden="true">
        {picked.slice(0, 6).map((it) => (
          <span className="mini" key={it.id}>
            <ItemImage item={it} label={false} />
          </span>
        ))}
        {Array.from({ length: Math.min(c.missing.length, Math.max(0, 6 - picked.length)) }, (_, i) => (
          <span className="mini gap" key={`g${i}`} />
        ))}
      </span>
      {fn.dressCode && <span className="dress">{fn.dressCode}</span>}
    </a>
  );
}
