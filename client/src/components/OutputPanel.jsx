import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SkeletonLoader from './SkeletonLoader';

export default function OutputPanel({ result, loading, error, warning, mode }) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  // Автопрокрутка вниз пока стримится новый текст.
  useEffect(() => {
    if (!scrollRef.current || !loading) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [result, loading]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ничего не делает — это не критично.
    }
  };

  const showEmpty = !loading && !result && !error;
  const showSkeleton = loading && !result;

  return (
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
      className="glass relative flex flex-col rounded-4xl shadow-soft overflow-hidden"
    >
      <header className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Понятным языком</h2>
          <p className="text-xs text-white/40 mt-0.5">
            {loading ? 'Думаю…' : result ? 'Готово' : 'Здесь появится результат'}
          </p>
        </div>

        <AnimatePresence>
          {result && !loading && (
            <motion.button
              type="button"
              onClick={handleCopy}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Скопировано</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Скопировать</span>
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <div
        ref={scrollRef}
        className="clean-scroll flex-1 px-6 pb-6 overflow-y-auto min-h-[320px]"
      >
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              <div className="font-medium mb-1">Что-то пошло не так</div>
              <div className="text-red-200/80 text-xs">{error}</div>
            </motion.div>
          )}

          {showSkeleton && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SkeletonLoader />
            </motion.div>
          )}

          {showEmpty && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full min-h-[280px] flex items-center justify-center text-center"
            >
              <div className="max-w-xs">
                <div className="text-5xl mb-4 animate-float inline-block">📜</div>
                <p className="text-white/60 text-sm">
                  Вставьте текст слева, выберите режим и нажмите{' '}
                  <span className="text-white">«Упростить»</span>.
                </p>
                <p className="text-white/30 text-xs mt-2">
                  Текущий режим:{' '}
                  <span className="text-white/60">{modeLabel(mode)}</span>
                </p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.article
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose-clarify"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              {loading && (
                <motion.span
                  className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400 align-middle"
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              {warning && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
                >
                  <div className="font-medium mb-1">Ответ может быть неполным</div>
                  <div className="text-amber-100/80 text-xs">{warning}</div>
                </motion.div>
              )}
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function modeLabel(mode) {
  return (
    {
      summary: 'Краткий пересказ',
      risks: 'Скрытые риски',
      eli5: 'Как 10-летнему',
    }[mode] || 'Краткий пересказ'
  );
}
