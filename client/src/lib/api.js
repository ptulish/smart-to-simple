// Стримим SSE-ответ от /api/clarify руками: fetch + ReadableStream + парсинг event/data.
// Возвращает функцию-cancel, чтобы можно было прервать запрос.

export function streamClarify({ text, mode, onChunk, onDone, onError, onWarning }) {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onError?.(data.error || `Сервер вернул ${response.status}`);
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
