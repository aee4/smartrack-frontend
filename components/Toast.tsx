import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return undefined;

    const timeout = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-5 right-5 z-[80] max-w-sm border border-border border-l-4 border-l-gold bg-white px-5 py-3 text-sm text-ink shadow-soft"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
