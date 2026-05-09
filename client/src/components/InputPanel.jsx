import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { extractTextFromFile } from '../lib/extractText';

const ACCEPTED = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';

export default function InputPanel({
  text,
  onTextChange,
  loading,
  onSubmit,
  onCancel,
  canSubmit,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileError('');
    setParsing(true);
    try {
      const extracted = await extractTextFromFile(file);
      if (!extracted || extracted.trim().length < 10) {
        setFileError('Не удалось вытащить текст из файла. Возможно, это скан без OCR.');
      } else {
        onTextChange(extracted);
      }
    } catch (err) {
      setFileError(err.message || 'Не получилось прочитать файл');
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const charCount = text.length;
  const tooShort = charCount > 0 && charCount < 30;

  return (
    <motion.section
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass relative flex flex-col rounded-4xl shadow-soft overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <header className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Оригинал</h2>
          <p className="text-xs text-white/40 mt-0.5">Текст договора, оферты, EULA и т.п.</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing || loading}
          className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50"
        >
          {parsing ? 'Читаю файл…' : '📎 Загрузить файл'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </header>

      <div className="relative flex-1 px-6">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={loading}
          placeholder="Вставьте текст договора или условий использования…"
          className="clean-scroll w-full h-full min-h-[320px] resize-none bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-white/30 disabled:opacity-60"
        />

        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 m-3 rounded-3xl border-2 border-dashed border-indigo-400/70 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">📥</div>
                <div className="text-sm font-medium">Бросьте файл сюда</div>
                <div className="text-xs text-white/50 mt-1">PDF, DOCX или TXT</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="px-6 pt-3 pb-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span className={tooShort ? 'text-amber-300/80' : ''}>
            {charCount} символов{tooShort ? ' · слишком мало' : ''}
          </span>
          {text && !loading && (
            <button
              type="button"
              onClick={() => onTextChange('')}
              className="hover:text-white/70 transition-colors"
            >
              Очистить
            </button>
          )}
        </div>

        {fileError && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {fileError}
          </div>
        )}

        {loading ? (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl py-3.5 font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
          >
            Остановить
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className={`relative w-full rounded-2xl py-3.5 font-semibold text-white overflow-hidden transition-opacity ${
              canSubmit ? 'btn-gradient shadow-glow' : 'bg-white/10 cursor-not-allowed opacity-60'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>Упростить</span>
              <span className="text-base">✨</span>
            </span>
          </motion.button>
        )}
      </footer>
    </motion.section>
  );
}
