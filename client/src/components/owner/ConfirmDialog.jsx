import React, { useEffect } from 'react'

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmClass = variant === 'danger' ? 'admin-btn-danger' : 'admin-btn-primary'

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--admin-overlay)]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="admin-card rounded-t-2xl sm:rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] max-w-md w-full p-5 sm:p-6 max-h-[90svh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="admin-confirm-title" className="text-lg font-semibold text-[var(--admin-ink)] break-words">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--admin-muted)] break-words leading-relaxed">{message}</p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={`admin-btn ${confirmClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
