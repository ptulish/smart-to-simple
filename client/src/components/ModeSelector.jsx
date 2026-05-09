import { motion } from 'framer-motion';

const MODES = [
  {
    id: 'summary',
    label: 'Краткий пересказ',
    hint: 'О чём этот документ в целом',
    emoji: '📝',
  },
  {
    id: 'risks',
    label: 'Скрытые риски',
    hint: 'Что может выйти боком',
    emoji: '⚠️',
  },
  {
    id: 'eli5',
    label: 'Как 10-летнему',
    hint: 'Объяснить совсем просто',
    emoji: '🧒',
  },
];

export default function ModeSelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <motion.button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`group relative flex flex-col items-start gap-1 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
              active
                ? 'border-indigo-400/60 bg-indigo-500/15'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="text-lg leading-none">{mode.emoji}</span>
            <span className="text-sm font-medium text-white">{mode.label}</span>
            <span className="text-[11px] text-white/50">{mode.hint}</span>
            {active && (
              <motion.div
                layoutId="mode-active"
                className="absolute inset-0 rounded-2xl ring-1 ring-indigo-400/50 pointer-events-none"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
