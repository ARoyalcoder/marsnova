import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../animations/variants';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl, title }) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // The parent passes a new onClose on every render; the effect below must not restart (and
  // re-grab focus) each time, so it reads the latest one from a ref.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Keyboard behaviour of a modal dialog: Escape closes it, Tab stays inside it, focus moves in
  // when it opens and goes back to the button that opened it when it closes, and the page behind
  // does not scroll. Previously only the close button worked and focus stayed on the page behind.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !dialogRef.current.contains(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          onClick={onClose}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalBackdropVariants}
        >
          <motion.div
            ref={dialogRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Video player'}
            style={{ maxWidth: '800px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
            variants={modalContentVariants}
          >
            <button ref={closeButtonRef} className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
            {title && (
              <h3 id={titleId} style={{ marginBottom: '16px', color: '#fff', fontSize: '18px' }}>
                {title}
              </h3>
            )}
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
              <video
                controls
                autoPlay
                src={videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
