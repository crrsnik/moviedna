# MovieDNA

MovieDNA — приложение для исследования собственных кинопредпочтений.
Стартовый экран: «MovieDNA — Discover your movie identity».

## Статус

Stage 1 — Firebase foundation.

## Стек

- React и React DOM
- Vite и обычный JavaScript (JSX), без TypeScript
- Tailwind CSS v4 — utility-классы через `@tailwindcss/vite`
- OXLint для проверки кода
- react-router-dom — Data Router с общим layout и страницами-заглушками
- Firebase SDK — modular API, инициализация App, Auth, Firestore и Storage через переменные Vite

## Локальный запуск

```sh
npm install
cp .env.example .env.local
```

Заполните `.env.local` значениями Web App configuration из Firebase Console
(настройки проекта → ваше веб-приложение). Затем запустите:

```sh
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
Файл `.env.example` содержит имена шести обязательных переменных Firebase без значений.
Firebase SDK инициализируется при старте через `src/shared/config/firebase.js`
из `import.meta.env`. При отсутствии или пустом значении переменной ошибка
содержит только её имя. Повторная инициализация при HMR защищена проверкой `getApps()`.
`.env` и `.env.local` игнорируются Git; `.env.local` не коммитится.
Реальные значения не добавляются в исходный код, README или `.env.example`.

## Базовая маршрутизация

Общий `AppLayout` содержит Header и область контента с `Outlet`.
Маршруты определены в `src/app/router.jsx` через `createBrowserRouter`:

- `/` — HomePage
- `/movies` — MoviesPage
- `/tv` — TvShowsPage
- `/actors` — ActorsPage
- `/login` — LoginPage
- `/register` — RegisterPage
- `*` — NotFoundPage

Страницы содержат только заголовки и подписи. Вход и регистрация не реализованы; запросы к Firestore, Storage и TMDB не выполняются.

## Стили

Tailwind CSS v4 подключён плагином `@tailwindcss/vite` в `vite.config.js`
рядом с React plugin и импортом `@import "tailwindcss";` в `src/index.css`.
Layout использует нейтральный тёмный стиль, адаптивный Header, активные ссылки
и состояния hover и keyboard focus. Повторяющаяся разметка страниц вынесена
в `PagePlaceholder`. Это временная техническая основа, а не финальный дизайн.

## Firebase CLI

Firebase CLI установлен локально как devDependency `firebase-tools`.
Авторизация выполняется вручную через `npm run firebase:login`.
Команды для последующего деплоя:

```sh
npm run firebase:deploy:rules
npm run firebase:deploy:indexes
npm run firebase:deploy:firestore
```

`.firebaserc` хранит только публичный Project ID. `firebase.json` связывает
существующую базу Firestore `(default)` с `firestore.rules` и
`firestore.indexes.json`. Эти четыре файла коммитятся; `.env.local` не коммитится.
Локальные правила запрещают все чтения и записи (deny-all), индексы пока пустые.
Добавление файлов не меняет правила в Firebase Console: они применяются
только при явном деплое. Авторизация CLI выполнена владельцем проекта; deny-all правила развёрнуты
в базе `(default)`. Индексы и другие сервисы не деплоились.
