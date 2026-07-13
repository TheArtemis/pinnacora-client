type SurrenderConfirmDialogProps = {
  surrendering: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function SurrenderConfirmDialog({
  surrendering,
  onConfirm,
  onCancel,
}: SurrenderConfirmDialogProps) {
  return (
    <div className="meld-order-picker__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="meld-order-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="surrender-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="meld-order-picker__header">
          <h2 id="surrender-confirm-title">Surrender?</h2>
          <p className="muted">You will lose this game.</p>
        </div>

        <div className="meld-order-picker__actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={surrendering}>
            Cancel
          </button>
          <button type="button" className="secondary-button" onClick={onConfirm} disabled={surrendering}>
            {surrendering ? 'Surrendering...' : 'Surrender'}
          </button>
        </div>
      </div>
    </div>
  )
}
