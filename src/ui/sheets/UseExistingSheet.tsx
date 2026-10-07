import { useMemo } from 'react';
import { Sheet } from '../components/Sheet';
import { ItemImage } from '../components/ItemImage';
import { usePlanData } from '../hooks';
import { placeItem } from '../../db/repo';
import { closeSheet } from '../../state/sheets';
import { showToast } from '../../state/store';

/** IT-6: reuse an item from anywhere in the plan, as a reference. */
export function UseExistingSheet({ planId, functionId, slotId }: { planId: string; functionId: string; slotId: string }) {
  const data = usePlanData(planId);
  const list = useMemo(() => {
    if (!data) return [];
    const here = new Set(data.placements.filter((p) => p.functionId === functionId && p.slotId === slotId).map((p) => p.itemId));
    const sameSlot = new Set(data.placements.filter((p) => p.slotId === slotId).map((p) => p.itemId));
    return data.items.filter((i) => !here.has(i.id)).sort((a, b) => Number(sameSlot.has(b.id)) - Number(sameSlot.has(a.id)) || b.createdAt - a.createdAt);
  }, [data, functionId, slotId]);
  if (!data) return null;
  const where = (itemId: string) =>
    data.placements
      .filter((p) => p.itemId === itemId)
      .map((p) => data.functions.find((f) => f.id === p.functionId)?.name)
      .filter(Boolean)
      .join(', ') || 'Inbox';
  const slot = data.slots.find((s) => s.id === slotId);
  return (
    <Sheet title={`Use existing for ${slot?.name ?? 'this slot'}`} tall>
      {list.length === 0 && <p className="muted">Nothing else to reuse yet.</p>}
      <div className="list-top">
        {list.map((it) => (
          <button
            key={it.id}
            className="menu-item"
            style={{ minHeight: 72 }}
            onClick={async () => {
              await placeItem(it.id, functionId, slotId);
              closeSheet();
              showToast(`Added ${it.title}`);
            }}
          >
            <span className="mini" style={{ position: 'relative' }}>
              <ItemImage item={it} label={false} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span>{it.title}</span>
              <span className="meta">{where(it.id)}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
