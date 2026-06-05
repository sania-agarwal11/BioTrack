export default function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          {onSubmit && (
            <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
              {loading ? 'Saving...' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
