import { openSheet } from '../../state/sheets';

export function TopBar({ planId, planTitle }: { planId?: string; planTitle?: string }) {
  return (
    <header className="topbar no-print">
      <a className="wordmark" href="#/" aria-label="Trousseau home">
        Trousseau
      </a>
      <span className="spacer" />
      <button className="plan-switch" onClick={() => openSheet({ kind: 'menu', planId })} aria-haspopup="dialog">
        <span>{planTitle ?? 'Menu'}</span>
        <span aria-hidden="true">▾</span>
      </button>
    </header>
  );
}
