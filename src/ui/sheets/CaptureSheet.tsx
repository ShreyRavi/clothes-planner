import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { captureFile, captureImageUrl, captureLink, captureText } from '../actions';
import { showToast } from '../../state/store';

type Target = { functionId: string; slotId: string } | undefined;

/** Capture: photo library, camera, paste, link or image address (IT-1, IT-2, IT-3). */
export function CaptureSheet({ planId, target }: { planId: string; target: Target }) {
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* write() already showed the save-failed banner */
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    void run(async () => {
      if (list.length === 1) {
        await captureFile(planId, list[0], target, list[0].name);
        return;
      }
      // Several photos: save them all to the same slot (or Inbox) in one go.
      for (const f of list.slice(0, -1)) {
        await captureFile(planId, f, target, f.name);
      }
      await captureFile(planId, list[list.length - 1], target, list[list.length - 1].name);
      showToast(`Saved ${list.length} photos`);
    });
  };

  const paste = () =>
    run(async () => {
      try {
        if (navigator.clipboard?.read) {
          const entries = await navigator.clipboard.read();
          for (const e of entries) {
            const type = e.types.find((t) => t.startsWith('image/'));
            if (type) {
              await captureFile(planId, await e.getType(type), target);
              return;
            }
          }
          for (const e of entries) {
            if (e.types.includes('text/plain')) {
              await captureText(planId, await (await e.getType('text/plain')).text(), target);
              return;
            }
          }
        } else if (navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text.trim()) {
            await captureText(planId, text, target);
            return;
          }
        }
        showToast('Nothing to paste. Copy a link or an image first.');
      } catch {
        showToast('Paste was blocked. Paste into the link box instead.');
      }
    });

  return (
    <Sheet title="Add an item">
      <div className="capture-grid">
        <label className="capture-opt">
          Photo library
          <small>Screenshots and saved photos</small>
          <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => onFiles(e.target.files)} aria-label="Choose from photo library" />
        </label>
        <label className="capture-opt">
          Camera
          <small>Take a photo now</small>
          <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => onFiles(e.target.files)} aria-label="Take a photo" />
        </label>
        <button className="capture-opt" onClick={paste} disabled={busy}>
          Paste
          <small>A copied link or image</small>
        </button>
      </div>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (link.trim()) void run(() => captureLink(planId, link, target));
        }}
      >
        <label className="eyebrow" htmlFor="cap-link">
          Product link
        </label>
        <div className="row" style={{ gap: 8 }}>
          <input id="cap-link" className="input" inputMode="url" placeholder="Paste a link from any shop" value={link} onChange={(e) => setLink(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || !link.trim()}>
            Save
          </button>
        </div>
      </form>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          if (imageUrl.trim()) void run(() => captureImageUrl(planId, imageUrl, target));
        }}
      >
        <label className="eyebrow" htmlFor="cap-img">
          Image address
        </label>
        <div className="row" style={{ gap: 8 }}>
          <input id="cap-img" className="input" inputMode="url" placeholder="https://… .jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || !imageUrl.trim()}>
            Save
          </button>
        </div>
        <span className="meta">Image addresses show up in shared links. Photos from your phone travel only in images and backup files.</span>
      </form>
      <span className="meta" style={{ textAlign: 'center' }}>
        Tip: paste a link or image anywhere in the app to save it.
      </span>
    </Sheet>
  );
}
