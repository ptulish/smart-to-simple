import { motion } from 'framer-motion';

const lines = [
  { w: '40%', h: 'h-6' },
  { w: '92%', h: 'h-3' },
  { w: '85%', h: 'h-3' },
  { w: '78%', h: 'h-3' },
  { w: '30%', h: 'h-5', mt: 'mt-6' },
  { w: '90%', h: 'h-3' },
  { w: '95%', h: 'h-3' },
  { w: '60%', h: 'h-3' },
];

export default function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {lines.map((l, i) => (
        <div
          key={i}
          className={`skeleton-line ${l.h} ${l.mt ?? ''}`}
          style={{ width: l.w }}
        />
      ))}
    </motion.div>
  );
}
