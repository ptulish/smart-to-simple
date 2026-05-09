# Clarify — юридический переводчик на человеческий

Web-приложение, которое превращает «канцелярский» текст в понятные списки действий и рисков с помощью Gemini.

- **Frontend:** React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express, безопасно держит API-ключ
- **AI:** Google Gemini 1.5 Flash (бесплатный тариф, нативный streaming)

## Возможности

- Три режима: **Краткий пересказ**, **Скрытые риски**, **Объясни как 10-летнему**
- Ответ ИИ стримится в реальном времени (Server-Sent Events)
- Markdown-разметка, списки, заголовки, таблицы
- Drag-and-drop загрузка `.pdf`, `.docx`, `.txt`
- Кнопка «Скопировать», skeleton-загрузка, glassmorphism, плавные анимации
- Обработка ошибок: слишком короткий/длинный текст, проблемы с ключом, сетевые сбои

## Структура

```
smart-to-simple/
├── client/   # React + Vite UI
└── server/   # Express + Gemini proxy
```

## Запуск

### 1. Получить бесплатный ключ Gemini

Открыть [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), нажать **Create API key**, скопировать.

### 2. Backend

```bash
cd server
cp .env.example .env
# вписать GEMINI_API_KEY=... в .env
npm install
npm run dev   # http://localhost:3001
```

### 3. Frontend

В отдельном терминале:

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

Vite проксирует `/api` на `http://localhost:3001`, так что CORS трогать не нужно.

Открыть [http://localhost:5173](http://localhost:5173) — готово.

## Бесплатные лимиты Gemini 1.5 Flash

На момент написания: **1500 запросов/день и 1M токенов/минуту** на free-tier — для личного использования с запасом.

## Endpoints

- `GET /api/health` — статус сервера и наличие ключа
- `POST /api/clarify` — `{ text, mode }`, отдаёт SSE-поток (`event: chunk` / `event: done` / `event: error`)

## Дисклеймер

Это не юридическая консультация. Результаты ИИ нужно перепроверять у живого юриста, особенно перед подписанием.
