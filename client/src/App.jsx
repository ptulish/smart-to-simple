import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ModeSelector from './components/ModeSelector';
import { streamClarify } from './lib/api';

export default function App() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('summary');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const cancelRef = useRef(null);

  const canSubmit = text.trim().length >= 30 && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setResult('');
    setError('');
    setWarning('');
    setLoading(true);

    cancelRef.current = streamClarify({
      text,
      mode,
      onChunk: (piece) => setResult((prev) => prev + piece),
      onWarning: (w) => setWarning(w?.message || ''),
      onDone: () => {
        setLoading(false);
        cancelRef.current = null;
      },
      onError: (msg) => {
        setError(msg);
        setLoading(false);
        cancelRef.current = null;
      },
    });
  };

  const handleCancel = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setLoading(false);
  };

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Декоративный фон с градиентными «пятнами», как у Apple */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[35rem] h-[35rem] bg-fuchsia-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[40rem] h-[40rem] bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:py-14">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Powered by Gemini · приватно и быстро</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-white via-white to-indigo-200 bg-clip-text text-transparent">
              Clarify
            </span>
          </h1>
          <p className="mt-3 text-white/60 max-w-xl mx-auto text-base">
            Юридический текст по-человечески: коротко, без воды и со списком того,
            что от вас на самом деле хотят.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <ModeSelector value={mode} onChange={setMode} disabled={loading} />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 min-h-[60vh]">
          <InputPanel
            text={text}
            onTextChange={setText}
            loading={loading}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            canSubmit={canSubmit}
          />
          <OutputPanel
            result={result}
            loading={loading}
            error={error}
            warning={warning}
            mode={mode}
          />
        </div>

        <footer className="mt-10 text-center text-xs text-white/30">
          Это не юридический совет. Результаты ИИ нужно перепроверять.
        </footer>
      </div>
    </div>
  );
}
