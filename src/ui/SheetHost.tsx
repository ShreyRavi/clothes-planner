import { lazy, Suspense } from 'react';
import { useSheet } from '../state/sheets';
import { CaptureSheet } from './sheets/CaptureSheet';
import { PlaceSheet } from './sheets/PlaceSheet';
import { ItemSheet } from './sheets/ItemSheet';
import { MenuSheet } from './sheets/MenuSheet';
import { PlanDetailsSheet } from './sheets/PlanDetailsSheet';
import { UseExistingSheet } from './sheets/UseExistingSheet';
import { SlotsSheet } from './sheets/SlotsSheet';
import { ConfirmSheet } from './sheets/ConfirmSheet';
import { RestoreSheet } from './sheets/RestoreSheet';
import { ViewerSheet } from './sheets/ViewerSheet';
import { Sheet } from './components/Sheet';

// The share renderer, codec UI and zip code load only when Share opens (eng D11).
const ShareSheet = lazy(() => import('./sheets/ShareSheet'));

export function SheetHost() {
  const s = useSheet();
  if (!s) return null;
  switch (s.kind) {
    case 'capture':
      return <CaptureSheet key="capture" planId={s.planId} target={s.target} />;
    case 'place':
      return <PlaceSheet key={`place-${s.itemId}`} planId={s.planId} itemId={s.itemId} justCaptured={s.justCaptured} addOnly={s.addOnly} />;
    case 'item':
      return <ItemSheet key={`item-${s.itemId}`} planId={s.planId} itemId={s.itemId} placementId={s.placementId} />;
    case 'menu':
      return <MenuSheet key="menu" planId={s.planId} />;
    case 'planDetails':
      return <PlanDetailsSheet key="details" planId={s.planId} />;
    case 'useExisting':
      return <UseExistingSheet key="use" planId={s.planId} functionId={s.functionId} slotId={s.slotId} />;
    case 'slots':
      return <SlotsSheet key="slots" planId={s.planId} functionId={s.functionId} />;
    case 'confirm':
      return <ConfirmSheet key="confirm" {...s} />;
    case 'restore':
      return <RestoreSheet key="restore" file={s.file} />;
    case 'viewer':
      return <ViewerSheet key="viewer" files={s.files} title={s.title} />;
    case 'share':
      return (
        <Suspense
          fallback={
            <Sheet title="Share" tall>
              <div className="preview-strip">
                <div className="preview skeleton" />
                <div className="preview skeleton" />
              </div>
            </Sheet>
          }
        >
          <ShareSheet key={`share-${s.functionId ?? 'all'}`} planId={s.planId} functionId={s.functionId} />
        </Suspense>
      );
  }
}
