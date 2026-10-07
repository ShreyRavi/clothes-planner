import { Sheet } from '../components/Sheet';
import { closeSheet } from '../../state/sheets';

export function ConfirmSheet(props: { title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void | Promise<void> }) {
  return (
    <Sheet title={props.title}>
      <p style={{ margin: 0 }}>{props.body}</p>
      <button
        className="btn btn-primary btn-block"
        onClick={async () => {
          closeSheet();
          await props.onConfirm();
        }}
      >
        {props.confirmLabel}
      </button>
      <button className="btn btn-block" onClick={closeSheet}>
        Cancel
      </button>
    </Sheet>
  );
}
