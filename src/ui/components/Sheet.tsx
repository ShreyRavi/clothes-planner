import { useEffect, useId, useRef, type ReactNode } from 'react';
import { closeSheet } from '../../state/sheets';

// Every overlay is a native <dialog> opened with showModal(): focus trap,
// Escape and an inert background come from the platform (design review DR15).
export function Sheet(props: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  tall?: boolean;
  popover?: boolean;
  dismissable?: boolean;
  headerAction?: ReactNode;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const close = props.onClose ?? closeSheet;
  const dismissable = props.dismissable !== false;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    titleRef.current?.focus();
    return () => {
      if (d.open) d.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`sheet${props.tall ? ' tall' : ''}${props.popover ? ' popover' : ''}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) close();
      }}
      onClick={(e) => {
        if (e.target === ref.current && dismissable) close();
      }}
    >
      <div className="sheet-body">
        <span className="grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={id} ref={titleRef} tabIndex={-1} className={props.hideTitle ? 'visually-hidden' : undefined}>
            {props.title}
          </h2>
          {props.headerAction ?? (
            <button className="btn-plain muted" onClick={close} disabled={!dismissable}>
              Close
            </button>
          )}
        </div>
        {props.children}
      </div>
    </dialog>
  );
}
