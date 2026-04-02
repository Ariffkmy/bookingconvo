import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  showClose?: boolean
}

export function Modal({ isOpen, onClose, title, children, size = 'md', showClose = true }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-xl z-10',
        'max-h-[90vh] overflow-y-auto',
        sizes[size]
      )}>
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl z-10">
            {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', loading
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
