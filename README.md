# MovieDNA

MovieDNA — приложение для исследования собственных кинопредпочтений.
Стартовый экран: «MovieDNA — Discover your movie identity».

## Статус

Stage 1 — technical foundation.

## Стек

- React и React DOM
- Vite и обычный JavaScript (JSX), без TypeScript
- OXLint для проверки кода
- react-router-dom — установлен, маршруты пока не настроены
- Firebase SDK — установлен, Firebase-проект пока не подключён

## Локальный запуск

```sh
npm install
npm run dev
```

## Проверка и сборка

```sh
npm run lint
npm run build
```

Production-сборка создаётся в `dist/`. Просмотр сборки локально:

```sh
npm run preview
```

## Структура

```text
src/
├── app/
├── pages/
├── features/
├── entities/
├── shared/
│   ├── components/
│   ├── config/
│   ├── hooks/
│   └── utils/
├── App.jsx
├── main.jsx
└── index.css
```

Пустые каталоги сохранены в Git с помощью `.gitkeep`.
Файл `.env.example` содержит пустые переменные для будущего подключения Firebase.
Для текущего запуска заполнять их не требуется. Firebase-конфигурации и реальных
ключей в проекте нет; `.env` и `.env.local` игнорируются Git.
