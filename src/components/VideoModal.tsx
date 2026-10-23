import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalBackdropVariants, modalContentVariants } from '../animations/variants';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  title?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoUrl, title }) => {
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
            className="modal-content"
            style={{ maxWidth: '800px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
            variants={modalContentVariants}
          >
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
            {title && <h3 style={{ marginBottom: '16px', color: '#fff', fontSize: '18px' }}>{title}</h3>}
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
