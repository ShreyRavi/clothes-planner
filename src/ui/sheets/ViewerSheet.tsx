import { useEffect, useMemo, useRef, useState } from 'react';
import { closeSheet } from '../../state/sheets';

/** iPhone fallback: full-screen pager of real <img> elements for Save to Photos (DR8). */
export function ViewerSheet({ files, title }: { files: File[]; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pager = useRef<HTMLDivElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  const [i, setI] = useState(0);
  useEffect(() => {
    ref.current?.showModal();
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [urls]);
  const last = i >= files.length - 1;
  const go = (n: number) => {
    pager.current?.scrollTo({ left: n * pager.current.clientWidth, behavior: 'smooth' });
    setI(n);
  };
  return (
    <dialog ref={ref} className="viewer" aria-label={`${title}: save images`} onCancel={(e) => { e.preventDefault(); closeSheet(); }}>
      <div className="viewer-top">
        <button className="btn-plain" onClick={closeSheet}>
          Close
        </button>
        <span className="num" aria-live="polite">
          {i + 1} of {files.length}
        </span>
        <span style={{ width: 52 }} />
      </div>
      <div
        className="viewer-pager"
        ref={pager}
        onScroll={(e) => {
          const el = e.currentTarget;
          setI(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {urls.map((u, k) => (
          <div className="viewer-page" key={u}>
            <img src={u} alt={`Image ${k + 1} of ${files.length}`} />
          </div>
        ))}
      </div>
      <div className="viewer-bar">
        <p>{last ? 'Saved them all? Open WhatsApp and send from Photos.' : 'Press and hold the image, then Save to Photos'}</p>
        <button className="btn btn-primary btn-block" onClick={() => (last ? closeSheet() : go(i + 1))}>
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </dialog>
  );
}
