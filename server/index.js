import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PROMPTS, MODES } from './prompts.js';

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    name: 'Clarify API',
    health: '/api/health',
    clarify: 'POST /api/clarify',
  });
});

const MIN_INPUT_LENGTH = 30;
const MAX_INPUT_LENGTH = 60_000;

// Список моделей по убыванию приоритета. Если основная не доступна для ключа —
// автоматически пробуем следующую. Можно переопределить через GEMINI_MODEL в .env.
const MODEL_FALLBACKS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
].filter(Boolean);

const NOT_FOUND_RX = /not found|not supported|404|unsupported/i;

// Лимит длины ответа. У Gemini 2.5 Flash потолок — 65k токенов.
// 8192 ≈ 25–30 тыс. символов на русском, этого хватает на самый детальный разбор.
// Можно переопределить через GEMINI_MAX_OUTPUT_TOKENS в .env.
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 8192;

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(API_KEY),
    modes: MODES,
    candidateModels: MODEL_FALLBACKS,
  });
});

// Полезно для отладки: показать какие модели реально доступны вашему ключу.
app.get('/api/models', async (_req, res) => {
  if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY не задан' });
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
    );
    const data = await r.json();
    const list = (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
    res.json({ models: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Главный эндпоинт: стримит ответ Gemini кусками через Server-Sent Events.
app.post('/api/clarify', async (req, res) => {
  const { text, mode } = req.body ?? {};

  if (typeof text !== 'string' || text.trim().length < MIN_INPUT_LENGTH) {
    return res.status(400).json({
      error: `Текст слишком короткий. Минимум ${MIN_INPUT_LENGTH} символов — иначе нечего упрощать.`,
    });
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return res.status(400).json({
      error: `Текст слишком длинный (${text.length} символов). Максимум — ${MAX_INPUT_LENGTH}.`,
    });
  }

  if (!MODES.includes(mode)) {
    return res.status(400).json({
      error: `Неизвестный режим "${mode}". Доступны: ${MODES.join(', ')}.`,
    });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY не задан на сервере. Создайте .env по образцу .env.example.',
    });
  }

  // SSE-заголовки: держим соединение открытым и шлём чанки по мере прихода.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const genAI = new GoogleGenerativeAI(API_KEY);
  const userPrompt = `Вот документ, который нужно обработать:\n\n"""\n${text.trim()}\n"""`;

  let lastError;
  let streamed = false;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: PROMPTS[mode],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });

      const result = await model.generateContentStream(userPrompt);

      let lastFinishReason;
      for await (const chunk of result.stream) {
        const piece = chunk.text();
        if (piece) {
          streamed = true;
          send('chunk', { text: piece });
        }
        const fr = chunk.candidates?.[0]?.finishReason;
        if (fr) lastFinishReason = fr;
      }

      console.log(
        `[clarify] used model: ${modelName}, finishReason: ${lastFinishReason || 'STOP'}`,
      );

      // Если ответ обрезался — честно говорим об этом, чтобы пользователь
      // не ломал голову, почему текст оборван.
      if (lastFinishReason && lastFinishReason !== 'STOP') {
        const reasons = {
          MAX_TOKENS: `Ответ оборван: модель упёрлась в лимит ${MAX_OUTPUT_TOKENS} токенов. Увеличьте GEMINI_MAX_OUTPUT_TOKENS в .env или попросите пересказ короче.`,
          SAFETY: 'Ответ заблокирован фильтрами безопасности Gemini.',
          RECITATION: 'Ответ заблокирован: модель посчитала, что слишком близко цитирует чужой материал.',
          OTHER: 'Ответ оборван по неизвестной причине на стороне Gemini.',
        };
        send('warning', {
          reason: lastFinishReason,
          message: reasons[lastFinishReason] || `Ответ оборван (${lastFinishReason}).`,
        });
      }

      send('done', {
        ok: true,
        model: modelName,
        finishReason: lastFinishReason || 'STOP',
      });
      res.end();
      return;
    } catch (err) {
      lastError = err;
      const isMissingModel = NOT_FOUND_RX.test(err?.message || '');
      console.warn(
        `[clarify] model "${modelName}" failed: ${err?.message?.slice(0, 200)}`,
      );

      // Если уже что-то отправили клиенту — добивать новой моделью нельзя,
      // получится мешанина. Просто отдаём ошибку.
      if (streamed) break;

      // Если ошибка не "модель не найдена" — нет смысла пробовать дальше.
      if (!isMissingModel) break;
    }
  }

  const raw = lastError?.message || 'Что-то пошло не так на стороне ИИ.';
  console.error('[clarify] AI error:', raw);
  let message = raw;
  if (raw.includes('API key') || raw.includes('API_KEY_INVALID')) {
    message = 'Похоже, ключ Gemini невалиден. Проверьте GEMINI_API_KEY.';
  } else if (NOT_FOUND_RX.test(raw)) {
    message =
      'Ни одна из моделей Gemini не доступна вашему ключу. Откройте /api/models — там список доступных, и пропишите GEMINI_MODEL=... в .env.';
  } else if (raw.includes('quota') || raw.includes('429')) {
    message = 'Превышен бесплатный лимит Gemini. Подождите немного и попробуйте снова.';
  }
  send('error', { error: message });
  res.end();

  req.on('close', () => {
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Clarify server is up: http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY не задан — запросы к /api/clarify будут падать.');
  }
});
