# MovieDNA

MovieDNA — приложение для исследования собственных кинопредпочтений.
Стартовый экран: «MovieDNA — Discover your movie identity».

## Статус

Stage 2 — registration.

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

Страница `/register` содержит форму регистрации. `/login` пока остаётся заглушкой.
Оба маршрута доступны гостям. Каталог, Storage и TMDB пока не подключены.

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
Локальные правила описывают начальное создание профиля; индексы пока пустые.
Добавление файлов не меняет правила в Firebase Console: они применяются
только при явном деплое. Правила начального создания профиля развёрнуты
в базе `(default)`. Индексы и другие сервисы не деплоились.

## Authentication state

AuthProvider отслеживает Firebase-сессию и показывает экран загрузки до её
восстановления. При ошибке отображается нейтральное сообщение без данных Firebase.
Header показывает Log in / Register гостям, а авторизованным пользователям —
имя или email и Log out. Во время выхода повторное нажатие блокируется;
успешный выход возвращает на главную. Вход пока не реализован.

## Начальный профиль и локальные Security Rules

`users/{uid}` содержит ровно следующие поля:

```js
{
  username: 'movie_fan',
  displayName: 'Movie Fan',
  photoURL: null,
  bio: '',
  onboardingCompleted: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`usernames/{username}` резервирует уникальное имя и содержит только
`userId` (UID владельца) и `createdAt: serverTimestamp()`.
Email остаётся в Firebase Authentication и не дублируется в Firestore.
Username: 3–20 символов, только lowercase `a-z`, цифры и `_`.
Display name нужно обрезать клиентским `trim()` до записи; после trim допустимы
1–50 символов. Rules проверяют строковый тип и длину.

Профиль и reservation создаются вместе одним атомарным `writeBatch` с
`serverTimestamp()`. Правила проверяют отсутствие связанного документа до
операции и взаимные ссылки через `getAfter()` после неё. Владелец может получить
только свой профиль; авторизованный пользователь — конкретный username.
List, update и delete запрещены. Остальные коллекции остаются deny-all.

### Тестирование

Нужен установленный JDK (проверено на JDK 21) и зависимости из `npm install`:

```sh
npm run test:rules
```

Команда запускает только Firestore Emulator на `127.0.0.1:8080`, выполняет
тесты через встроенный `node:test` и автоматически останавливает эмулятор.
UI отключён. Project ID `demo-moviedna` используется исключительно для эмулятора.
Тесты не загружают `.env.local` или конфигурацию приложения и отказываются
работать без локального emulator host и демонстрационного Project ID.
Контексты авторизации имитируются библиотекой тестирования, Auth users не создаются.

Правила развёрнуты в production после успешного прохождения 63 тестов
в Emulator и чистого production audit. Деплой затронул только Firestore Rules;
production-документы и Auth users при проверке правил не создавались.

## Регистрация

Форма содержит Username, Display name, Email, Password и Confirm password.
Username нормализуется через trim и lowercase и резервируется уникально.
Пароль: 8–128 символов, без дополнительных требований к регистру или спецсимволам.

После клиентской валидации создаётся Firebase Auth account и задаётся displayName.
Firestore transaction проверяет username и атомарно создаёт профиль `users/{uid}`
и reservation `usernames/{username}` с серверными timestamps. Email хранится только
в Auth. Успех переводит на главную; форма блокирует повторный submit.
Промежуточная Auth-сессия не закрывает форму до завершения transaction или rollback.

При ошибке до завершения transaction сервис удаляет только созданный текущей
попыткой Auth account. Если удаление не удалось, выполняется попытка signOut,
а форма сообщает о проблеме завершения регистрации. Firestore-документы не удаляются.
Технические сообщения Firebase не показываются, введённые данные при ошибке сохраняются.

Проверки:

```sh
npm run test:unit
npm run test:rules
```

Unit tests проверяют валидацию, безопасные сообщения и сервис с подменёнными
Firebase-функциями. Rules tests используют только локальный Emulator.
Эти тесты не создают реальные Auth accounts или production-документы.
