import { useEffect, useMemo, useRef, useState } from 'react';
import { zipSync } from 'fflate';
import { Sheet } from '../components/Sheet';
import { usePlanData, type PlanData } from '../hooks';
import { planShareJobs, type ShareJob } from '../../share/images';
import { chooseFiles, downloadBlob, isPhone, shareFiles, canShareFiles } from '../../share/send';
import { encodePlan, LINK_TARGET_CHARS, LINK_WARN_CHARS, shareUrl } from '../../codec/codec';
import { closeSheet, openSheet } from '../../state/sheets';
import { showToast } from '../../state/store';
import { markBackedUp } from '../../db/repo';

interface Rendered {
  name: string;
  status: 'pending' | 'done' | 'failed';
  file?: File;
  url?: string;
}

// Rendered images stay cached for 5 minutes so re-sharing unchanged content is instant (D11).
const cache = new Map<string, { at: number; items: Rendered[] }>();
const CACHE_MS = 5 * 60 * 1000;

function versionOf(d: PlanData, functionId?: string): string {
  const fns = d.functions.filter((f) => !functionId || f.id === functionId);
  return JSON.stringify([
    functionId ?? '',
    d.plan.title, d.plan.owner, d.plan.startDate, d.plan.endDate,
    fns.map((f) => [f.id, f.name, f.date, f.timeOfDay, f.dressCode, f.order]),
    d.slots.map((s) => [s.id, s.name, s.optional, s.order, s.hiddenIn]),
    d.placements.filter((p) => p.picked).map((p) => [p.itemId, p.functionId, p.slotId]),
    d.items.map((i) => [i.id, i.title, i.photoId, i.imageUrl, i.link]),
  ]);
}

/** Share sheet: previews first, Send in thumb reach, link and backup below (SH-0, SH-1, SH-3, SH-4; DR5). */
export default function ShareSheet({ planId, functionId }: { planId: string; functionId?: string }) {
  const data = usePlanData(planId);
  const [items, setItems] = useState<Rendered[]>([]);
  const [index, setIndex] = useState(0);
  const jobsRef = useRef<ShareJob[]>([]);
  const versionRef = useRef('');
  const stripRef = useRef<HTMLDivElement>(null);
  const [showLink, setShowLink] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [preparingBackup, setPreparingBackup] = useState(false);
  const started = useRef(false);

  const fn = data?.functions.find((f) => f.id === functionId);
  const title = fn ? `Share ${fn.name}` : 'Share whole plan';

  const renderOne = async (i: number) => {
    const job = jobsRef.current[i];
    setItems((prev) => prev.map((r, k) => (k === i ? { ...r, status: 'pending' } : r)));
    try {
      const blob = await job.render();
      const file = new File([blob], job.name, { type: 'image/png' });
      const url = URL.createObjectURL(blob);
      setItems((prev) => {
        const next = prev.map((r, k) => (k === i ? { ...r, status: 'done' as const, file, url } : r));
        if (next.every((r) => r.status !== 'pending')) cache.set(versionRef.current, { at: Date.now(), items: next });
        return next;
      });
    } catch {
      setItems((prev) => prev.map((r, k) => (k === i ? { ...r, status: 'failed' } : r)));
    }
  };

  useEffect(() => {
    if (!data || started.current) return;
    started.current = true;
    const version = versionOf(data, functionId);
    versionRef.current = version;
    const hit = cache.get(version);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      setItems(hit.items);
      return;
    }
    (async () => {
      const jobs = await planShareJobs(planId, functionId);
      jobsRef.current = jobs;
      setItems(jobs.map((j) => ({ name: j.name, status: 'pending' })));
      for (let i = 0; i < jobs.length; i++) await renderOne(i);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const link = useMemo(() => {
    if (!data || !showLink) return null;
    const { data: payload, localPhotosLeftOut } = encodePlan(data, { functionIds: functionId ? [functionId] : undefined });
    return { url: shareUrl(payload), localPhotosLeftOut };
  }, [data, showLink, functionId]);

  if (!data) return null;
  const done = items.filter((r) => r.status === 'done');
  const pending = items.filter((r) => r.status === 'pending').length;
  const allFailed = items.length > 0 && done.length === 0 && pending === 0;
  const overviewFailed = !functionId && items[0]?.status === 'failed';
  const files = done.map((r) => r.file!);
  const singleOnly = files.length > 1 && !canShareFiles(files) && canShareFiles(files.slice(0, 1));
  const sendDisabled = pending > 0 || done.length === 0 || (singleOnly && overviewFailed);

  // Must stay synchronous up to navigator.share: the tap's activation is needed (design doc SH-0).
  const send = () => {
    const choice = chooseFiles(files, overviewFailed);
    if (choice.mode === 'blocked') return;
    if (choice.mode === 'share') {
      void shareFiles(choice.files, title).then((outcome) => {
        if (outcome === 'shared') {
          closeSheet();
          showToast(fn ? `Shared ${fn.name}` : `Shared ${choice.files.length} image${choice.files.length === 1 ? '' : 's'}`);
        } else if (outcome === 'error') {
          showToast("Couldn't open sharing", () => fallback(choice.files), 'Download instead');
        }
      });
      return;
    }
    fallback(choice.files);
  };

  const fallback = (list: File[]) => {
    if (isPhone()) {
      openSheet({ kind: 'viewer', files: list, title });
      return;
    }
    if (list.length === 1) downloadBlob(list[0], list[0].name);
    else {
      Promise.all(list.map(async (f) => [f.name, new Uint8Array(await f.arrayBuffer())] as const)).then((entries) => {
        const zip = zipSync(Object.fromEntries(entries.map(([n, b]) => [n, [b, { level: 0 }]])));
        downloadBlob(new Blob([zip as BlobPart], { type: 'application/zip' }), 'trousseau-images.zip');
      });
    }
  };

  const onScroll = () => {
    const el = stripRef.current;
    if (!el || !el.firstElementChild) return;
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 12;
    setIndex(Math.min(items.length - 1, Math.round(el.scrollLeft / w)));
  };

  return (
    <Sheet title={title} tall>
      <div ref={stripRef} className="preview-strip" onScroll={onScroll} aria-label="Image previews" tabIndex={0}>
        {items.length === 0 &&
          [0, 1].map((k) => <div key={k} className="preview skeleton" aria-hidden="true" />)}
        {items.map((r, i) => (
          <figure key={r.name} className="preview" style={{ margin: 0 }} aria-label={`Image ${i + 1} of ${items.length}`}>
            {r.status === 'done' && <img src={r.url} alt={`Preview of ${r.name}`} />}
            {r.status === 'pending' && <div className="state skeleton">Preparing</div>}
            {r.status === 'failed' && (
              <div className="state">
                <span>This image couldn't be made</span>
                <button className="btn" onClick={() => jobsRef.current.length && renderOne(i)} disabled={!jobsRef.current.length}>
                  Retry
                </button>
              </div>
            )}
          </figure>
        ))}
      </div>
      {items.length > 1 && (
        <span className="meta num" style={{ textAlign: 'center' }}>
          {index + 1} of {items.length}
        </span>
      )}
      {allFailed ? (
        <div className="stack">
          <p style={{ margin: 0 }}>Couldn't make the images.</p>
          <button className="btn" onClick={() => jobsRef.current.forEach((_, i) => renderOne(i))} disabled={!jobsRef.current.length}>
            Retry all
          </button>
        </div>
      ) : (
        <button className="btn btn-primary btn-block" onClick={send} disabled={sendDisabled}>
          {pending > 0 ? `Preparing ${items.length - pending + 1} of ${items.length}` : `Send ${done.length} image${done.length === 1 ? '' : 's'}`}
        </button>
      )}

      {!showLink ? (
        <button className="btn-text" style={{ alignSelf: 'center' }} onClick={() => setShowLink(true)}>
          Send as link
        </button>
      ) : (
        link && (
          <section className="stack" aria-labelledby="link-h">
            <h3 className="eyebrow" id="link-h">Link</h3>
            {link.localPhotosLeftOut > 0 && (
              <p className="warn" role="note">
                {link.localPhotosLeftOut} photo{link.localPhotosLeftOut === 1 ? '' : 's'} from your phone won't appear in the link. Send the images above, or the backup file, to include them.
              </p>
            )}
            {link.url.length > LINK_WARN_CHARS && (
              <p className="warn" role="note">
                This link is long and may get cut off in chat apps. Send the images or the backup file instead.
              </p>
            )}
            <input className="input" readOnly value={link.url} aria-label="Share link" onFocus={(e) => e.target.select()} />
            <span className="meta num">
              {link.url.length.toLocaleString()} characters{link.url.length <= LINK_TARGET_CHARS ? '' : ' (long)'}. The link is a snapshot; share a new one after changes.
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn"
                onClick={() =>
                  navigator.clipboard?.writeText(link.url).then(
                    () => showToast('Link copied'),
                    () => showToast('Copy the link from the box above'),
                  )
                }
              >
                Copy link
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  className="btn"
                  onClick={() => {
                    navigator.share({ title: data.plan.title, url: link.url }).then(
                      () => {
                        closeSheet();
                        showToast('Link shared');
                      },
                      () => undefined,
                    );
                  }}
                >
                  Share link
                </button>
              )}
            </div>
          </section>
        )
      )}

      <section className="stack" aria-label="Backup file">
        {!backupFile ? (
          <button
            className="btn-text"
            style={{ alignSelf: 'center' }}
            disabled={preparingBackup}
            onClick={async () => {
              setPreparingBackup(true);
              try {
                const { buildBackup } = await import('../../backup/backup');
                const { blob, filename } = await buildBackup();
                const file = new File([blob], filename, { type: 'application/zip' });
                if (canShareFiles([file])) setBackupFile(file);
                else {
                  downloadBlob(blob, filename);
                  await markBackedUp();
                  showToast('Backup file saved');
                }
              } catch {
                showToast("Couldn't create the backup. Try again.");
              } finally {
                setPreparingBackup(false);
              }
            }}
          >
            {preparingBackup ? 'Preparing backup' : 'Send backup file, with photos'}
          </button>
        ) : (
          <button
            className="btn btn-block"
            onClick={() => {
              void shareFiles([backupFile], data.plan.title).then(async (o) => {
                if (o === 'shared') {
                  await markBackedUp();
                  closeSheet();
                  showToast('Backup file shared');
                }
              });
            }}
          >
            Send backup file
          </button>
        )}
      </section>
    </Sheet>
  );
}
