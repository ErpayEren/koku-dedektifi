'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { fadeUp } from '@/lib/animations';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUp.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
