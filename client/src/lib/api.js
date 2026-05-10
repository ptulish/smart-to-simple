// Стримим SSE-ответ от /api/clarify руками: fetch + ReadableStream + парсинг event/data.
// Возвращает функцию-cancel, чтобы можно было прервать запрос.

// В dev Vite проксирует /api → localhost. На Netlify переменная VITE_API_BASE_URL
// задаёт полный URL бэкенда (без слэша в конце), например https://….onrender.com
function resolvedApiBase() {
  let b = String(import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (/\/api$/i.test(b)) b = b.slice(0, -4).replace(/\/+$/, '');
  return b;
}

function clarifyUrl() {
  const base = resolvedApiBase();
  return base ? `${base}/api/clarify` : '/api/clarify';
}

const NETLIFY_HINT =
  'В Netlify задайте VITE_API_BASE_URL = URL сервера на Render (без слэша в конце), затем Deploy → Trigger deploy → Clear cache and deploy.';

export function streamClarify({ text, mode, onChunk, onDone, onError, onWarning }) {
  const controller = new AbortController();

  (async () => {
    try {
      const apiBase = resolvedApiBase();
      const url = clarifyUrl();

      if (import.meta.env.PROD && !apiBase) {
        onError?.(`Не задан адрес API. ${NETLIFY_HINT}`);
        return;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        let msg =
          data.error ||
          (response.status === 404 ? 'Страница не найдена (404).' : `Сервер вернул ${response.status}`);

        const onNetlify =
          typeof window !== 'undefined' && /netlify\.app$/i.test(window.location.hostname);
        if (response.status === 404 && !apiBase && import.meta.env.PROD && onNetlify) {
          msg = `Запрос ушёл на Netlify вместо Render. ${NETLIFY_HINT}`;
        }
        if (response.status === 404 && apiBase) {
          msg += ` Проверьте Render: ${apiBase}/api/health`;
        }

        onError?.(msg);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const handlers = { onChunk, onDone, onError, onWarning };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE-сообщения разделены пустой строкой.
        let separatorIndex;
        while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          handleEvent(rawEvent, handlers);
        }
      }

      if (buffer.trim()) handleEvent(buffer, handlers);
    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err.message || 'Сетевая ошибка');
    }
  })();

  return () => controller.abort();
}

function handleEvent(raw, { onChunk, onDone, onError, onWarning }) {
  const lines = raw.split('\n');
  let event = 'message';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }

  if (!data) return;

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }

  if (event === 'chunk') onChunk?.(parsed.text || '');
  else if (event === 'done') onDone?.(parsed);
  else if (event === 'warning') onWarning?.(parsed);
  else if (event === 'error') onError?.(parsed.error || 'Ошибка ИИ');
}
