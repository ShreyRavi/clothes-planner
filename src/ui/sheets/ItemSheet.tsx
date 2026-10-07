import { useMemo } from 'react';
import { Sheet } from '../components/Sheet';
import { ItemImage } from '../components/ItemImage';
import { CommitInput } from '../components/CommitInput';
import { statusTone } from '../components/StatusChip';
import { usePlanData } from '../hooks';
import { togglePick, updateItem } from '../../db/repo';
import { deleteWithUndo } from '../../db/actions';
import { write } from '../../db/write';
import { db } from '../../db/schema';
import { processImage, storePhotoTx } from '../../photos/capture';
import { cleanUrl, hostOf, safeUrl } from '../../domain/safeUrl';
import { STATUSES } from '../../domain/types';
import { closeSheet, openSheet } from '../../state/sheets';

const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'AED', 'CAD', 'AUD', 'SGD'];

/** Item sheet: image, title, link, note, price, status, and where it is used (IT-4, IT-6). */
export function ItemSheet({ planId, itemId, placementId }: { planId: string; itemId: string; placementId?: string }) {
  const data = usePlanData(planId);
  const item = data?.items.find((i) => i.id === itemId);
  const uses = useMemo(() => (data ? data.placements.filter((p) => p.itemId === itemId) : []), [data, itemId]);
  if (!data || !item) return null;
  const fnName = (id: string) => data.functions.find((f) => f.id === id)?.name ?? '';
  const slotName = (id: string) => data.slots.find((s) => s.id === id)?.name ?? '';
  const link = safeUrl(item.link);

  const replacePhoto = async (file: File | undefined) => {
    if (!file) return;
    const photo = await processImage(file);
    await write(async () => {
      const old = item.photoId;
      const photoId = await storePhotoTx(photo);
      await db.items.update(item.id, { photoId });
      if (old) await db.photos.where('photoId').equals(old).delete();
    });
  };

  return (
    <Sheet title={item.title} tall>
      <div className="item-hero">
        <ItemImage item={item} size="full" />
      </div>
      <label className="btn" style={{ position: 'relative', alignSelf: 'flex-start' }}>
        {item.photoId ? 'Replace photo' : 'Add a photo'}
        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0 }} onChange={(e) => replacePhoto(e.target.files?.[0])} />
      </label>
      <label className="field">
        <span className="eyebrow">Title</span>
        <CommitInput className="input" value={item.title} onCommit={(v) => updateItem(item.id, { title: v.trim() || item.title })} />
      </label>
      <div className="field">
        <label className="eyebrow" htmlFor="item-link">
          Link
        </label>
        <CommitInput id="item-link" className="input" inputMode="url" placeholder="https://" value={item.link} onCommit={(v) => updateItem(item.id, { link: cleanUrl(v) })} />
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="meta" style={{ color: 'var(--accent)' }}>
            Open on {hostOf(link)}
          </a>
        )}
      </div>
      <label className="field">
        <span className="eyebrow">Image address</span>
        <CommitInput className="input" inputMode="url" placeholder="Optional, travels in share links" value={item.imageUrl} onCommit={(v) => updateItem(item.id, { imageUrl: safeUrl(v) })} />
      </label>
      <div className="field">
        <span className="eyebrow" id="price-l">
          Price
        </span>
        <div className="row" style={{ gap: 8 }}>
          <select className="select" style={{ width: 96 }} aria-label="Currency" value={item.currency} onChange={(e) => updateItem(item.id, { currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <CommitInput
            className="input"
            aria-labelledby="price-l"
            inputMode="decimal"
            placeholder="Optional"
            value={item.price == null ? '' : String(item.price)}
            onCommit={(v) => {
              const n = Number(v.replace(/[^\d.]/g, ''));
              void updateItem(item.id, { price: v.trim() && Number.isFinite(n) && n > 0 ? n : null });
            }}
          />
        </div>
      </div>
      <div className="field">
        <span className="eyebrow" id="status-l">
          Status
        </span>
        <div className="status-seg" role="group" aria-labelledby="status-l">
          {STATUSES.map((s) => (
            <button key={s} aria-pressed={item.status === s} onClick={() => updateItem(item.id, { status: s })}>
              <span className={`status-dot ${statusTone(s)}`} />
              {s}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span className="eyebrow">Note</span>
        <textarea
          className="textarea"
          defaultValue={item.note}
          placeholder="Blouse needs 2 cm more at the waist"
          onBlur={(e) => e.target.value !== item.note && updateItem(item.id, { note: e.target.value })}
        />
      </label>
      <div className="field">
        <span className="eyebrow">Used in</span>
        {uses.length === 0 && <span className="meta">The Inbox. Place it in a function and slot.</span>}
        <div className="list-top">
          {uses.map((p) => (
            <div className="list-line" key={p.id} style={{ minHeight: 52 }}>
              <span className="txt">
                {fnName(p.functionId)}, {slotName(p.slotId)}
                {p.id === placementId && <span className="meta"> (here)</span>}
              </span>
              <button className="btn" aria-pressed={p.picked} onClick={() => togglePick(p.id)}>
                {p.picked ? 'Picked' : 'Pick'}
              </button>
              <button className="btn btn-icon" aria-label={`Remove from ${fnName(p.functionId)}, ${slotName(p.slotId)}`} onClick={() => deleteWithUndo('placement', p.id, `Removed from ${fnName(p.functionId)}`)}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!data.functions.length} onClick={() => openSheet({ kind: 'place', planId, itemId, addOnly: uses.length > 0 })}>
          {uses.length ? 'Use in another function' : 'Place it'}
        </button>
      </div>
      <button
        className="btn-text danger"
        style={{ alignSelf: 'flex-start' }}
        onClick={async () => {
          closeSheet();
          await deleteWithUndo('item', item.id, `${item.title} deleted`);
        }}
      >
        Delete this item
      </button>
    </Sheet>
  );
}
