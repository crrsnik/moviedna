# MovieDNA

MovieDNA — приложение для исследования собственных кинопредпочтений.
Стартовый экран: «MovieDNA — Discover your movie identity».

## Статус

Stage 7.2 — favorites and watchlist.

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
- `/forgot-password` — ForgotPasswordPage
- `/register` — RegisterPage
- `/onboarding` — защищённый OnboardingPage
- `*` — NotFoundPage

Страница `/register` содержит форму регистрации, `/login` — форму входа по email и паролю.
Эти маршруты и `/forgot-password` доступны гостям. Главная загружает trending movies и TV из TMDB; остальные страницы каталога пока остаются заглушками.

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
успешный выход возвращает на главную. Сессия входа обновляется существующей подпиской AuthProvider.

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
List и delete профилей запрещены; update допускается только для атомарного завершения
onboarding по Rules этапа 3.3a. Username reservation остаётся неизменяемым.
Неописанные коллекции сохраняют deny-all.

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

Базовые правила профиля/username были развёрнуты в production после прохождения 63 тестов
в Emulator и чистого production audit. Деплой затронул только Firestore Rules;
production-документы и Auth users при проверке правил не создавались.

## Регистрация

Форма содержит Username, Display name, Email, Password и Confirm password.
Username нормализуется через trim и lowercase и резервируется уникально.
Пароль: 8–128 символов, без дополнительных требований к регистру или спецсимволам.

После клиентской валидации создаётся Firebase Auth account и задаётся displayName.
Firestore transaction проверяет username и атомарно создаёт профиль `users/{uid}`
и reservation `usernames/{username}` с серверными timestamps. Email хранится только
в Auth. Успех переводит на `/onboarding`; форма блокирует повторный submit.
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

## Вход

Форма `/login` проверяет формат email после trim и наличие пароля. Пароль
передаётся без изменений; ограничения длины регистрации к входу не применяются.
Общая email-валидация используется обеими формами.

Сервис вызывает только Firebase Auth `signInWithEmailAndPassword` и возвращает
пользователя. Сам сервис входа не обращается к Firestore.
AuthProvider получает сессию через существующую подписку; успешный вход
переводит на `/onboarding` с заменой записи истории. GuestOnlyRoute направляет
авторизованных пользователей с гостевых форм туда же. Повторный submit блокируется на время запроса.

Неверные credentials, неизвестный пользователь и неверный пароль показывают
одинаковое сообщение `Incorrect email or password.`. Raw Firebase errors
и наличие конкретного email не раскрываются. Социальный вход пока не реализован. Unit tests входа используют подмену Firebase;
настоящий вход и изменения production-данных автоматическими проверками не выполняются.

## Восстановление пароля

Ссылка `Forgot password?` на странице входа ведёт на `/forgot-password`.
Форма проверяет email общей валидацией после trim и вызывает Firebase
`sendPasswordResetEmail`. Используется стандартное Firebase-письмо и hosted
action handler; custom continueUrl, ActionCodeSettings и обработка oobCode
в приложении не добавлены.

Успех и `auth/user-not-found` дают одинаковый результат и сообщение:
`If an account exists for this email, password reset instructions have been sent.`
Email в сообщении не отображается. Автоматического перенаправления нет;
остаётся ссылка `Back to log in`. На время запроса повторная отправка блокируется.
Ошибки сети, лимита запросов и недоступности операции показываются без Firebase codes.

Unit tests используют подменённую Firebase-функцию: настоящие письма не отправляются,
пароли и production users/documents не изменяются. Собственной страницы установки
нового пароля и email verification пока нет.

## Состояние профиля и onboarding

UserProfileProvider внутри AuthProvider связывает Firebase Auth user с собственным
документом `users/{uid}` через подписку `onSnapshot`. При logout или смене пользователя
предыдущий профиль сразу очищается, старая подписка снимается. Для гостя чтений нет.
Отсутствующий или повреждённый профиль и ошибки доступа показываются безопасным
сообщением с предложением обновить страницу; документы автоматически не создаются.

`/onboarding` защищён: гость переходит на `/login`, авторизованный пользователь
ожидает свой профиль. При `onboardingCompleted: false` показывается интерфейс оценки фильмов,
при `true` — переход на `/`. Header и logout доступны при ошибке профиля.
Главная, Movies, TV Shows и Actors остаются открытыми. Общее редактирование
профиля пока не реализовано. Unit tests профиля используют подмену подписки Firebase.

## Локальный каталог TMDB

В `.env.local` заполните `TMDB_READ_ACCESS_TOKEN` из настроек TMDB API.
Переменная **не использует префикс `VITE_`**. Не добавляйте значение в код или Git.
Локальная схема при `npm run dev`:

```text
Browser → /api/tmdb → Vite dev proxy → https://api.themoviedb.org/3
```

Proxy добавляет Bearer token только на сервере, проверяет TLS и разрешает только
GET к двум trending endpoints с параметром language. Token не попадает в client
bundle, URL или браузерные заголовки. Без токена dev-сервер сообщает об ошибке
конфигурации; `npm run build` токен не требует.

Главная параллельно загружает `/trending/movie/day` и `/trending/tv/day`
с `language=en-US`. Секции имеют отдельные loading/error/empty состояния и Retry;
уход со страницы отменяет запросы. Poster CDN — `https://image.tmdb.org/t/p/w342`.
Данные не записываются в Firebase. Поиск пока неактивен; detail pages отсутствуют.

**Production limitation:** статический hosting и `npm run preview` не предоставляют
`/api/tmdb`. Перед публичным deployment необходим backend/serverless route с этим
путём и серверным хранением токена. Не заменяйте proxy прямым браузерным запросом
с публичной переменной `VITE_*`.

Unit tests используют только синтетические данные и подменённый fetch.

### TMDB credits

This product uses the TMDB API but is not endorsed or certified by TMDB.

Логотип `public/tmdb-logo.svg` получен с [официальной страницы TMDB logos & attribution](https://www.themoviedb.org/about/logos-attribution)
и сохранён без изменений цвета, пропорций или ориентации. Атрибуция находится в общем footer.

Документация: [TMDB authentication](https://developer.themoviedb.org/docs/authentication-application),
[trending movies](https://developer.themoviedb.org/reference/trending-movies),
[trending TV](https://developer.themoviedb.org/reference/trending-tv),
[images](https://developer.themoviedb.org/docs/image-basics),
[Vite proxy](https://vite.dev/config/server-options#server-proxy).

## Локальная модель onboarding

[Firestore data model](docs/firestore-data-model.md) описывает собственные
`onboardingResponses` и единственный `onboarding/summary`. Завершение требует одного
атомарного batch: создание summary и переход профиля `onboardingCompleted: false → true`
с серверными timestamps. Rules проверяют обе стороны через `getAfter()`.
После завершения responses и summary доступны владельцу только для чтения.

Rules не пересчитывают реальные responses и не валидируют каждый элемент genreIds;
границы серверной проверки и обязанности будущего клиентского сервиса указаны в модели.
Rules этапа 3.3a развёрнуты в production только как `firestore:rules` после
прохождения 208 Rules tests (63 прежних + 145 новых), 209 unit tests и чистого
production audit. Автоматические тесты выполняются только в локальном Emulator;
production documents/users не читались и не изменялись, indexes не разворачивались.
На этапе 3.3a были подготовлены Rules; клиентский flow добавлен в этапе 3.3b.

## Onboarding experience

`/onboarding` загружает до 20 уникальных trending movies через существующий TMDB proxy
и собственные сохранённые responses из Firestore. Уже оценённые фильмы исключаются;
после обновления страницы прогресс восстанавливается с сервера.

Like / Dislike / Skip доступны кнопками. Карточку можно свайпнуть горизонтально
или сфокусировать и использовать ← / → / ↓. Вертикальный touch scroll сохраняется,
учитывается reduced motion. Следующая карточка появляется только после подтверждения
transaction; повторные действия блокируются, при ошибке текущая карточка остаётся.

Finish доступен при 10–30 responses и минимум 5 like/dislike. Сервис повторно читает
responses с сервера, валидирует документы и пересчитывает counts, затем одним batch
создаёт summary и завершает профиль. TMDB metadata не записываются. Автоматического
завершения нет. Существующий OnboardingRoute перенаправляет на `/` после подтверждённого
snapshot профиля; локальные snapshots с hasPendingWrites игнорируются.

Firestore getDocsFromServer нельзя отменить AbortSignal: устаревшие результаты
игнорируются после cleanup. TMDB-запрос отменяется AbortController. Unit tests
используют синтетические данные и подмену Firebase, Rules tests — только Emulator.
Гостевая dev-проверка не выполняет вход и не читает/изменяет production onboarding.

Минимум 5 like/dislike — клиентская гарантия качества, не отдельное ограничение Rules.
Подробные границы, включая конкуренцию вкладок, описаны в [модели](docs/firestore-data-model.md).

## Public catalog search

`/search?q=inception&type=all&page=1` is public, including for guests and users
who have not completed onboarding. Submit the reusable form on Home or Search;
there is no live search. URL parameters preserve reload and Back/Forward navigation.
All, Movies, TV Shows and People use the corresponding TMDB search endpoints.
Queries are trimmed with collapsed whitespace (2–100 characters), pages are bounded
to 1–500 and available results. Changing query/type resets the page. Adult content
is always disabled (`include_adult=false`); language is `en-US`.

Responses are normalized into movie/TV/person cards; malformed and unknown items
are discarded. Search does not store results in Firebase and movie cards link to their detail pages. Requests use only `/api/tmdb`; the private token remains in the Vite
server proxy. Static production deployment still requires a backend/serverless
`/api/tmdb` implementation with equivalent endpoint and parameter restrictions.

## Public catalogs

Movies (`/movies`) supports Popular, Top Rated, Now Playing and Upcoming.
TV Shows (`/tv`) supports Popular, Top Rated, Airing Today and On The Air.
Actors (`/actors`) supports Popular and Trending This Week. All routes are public,
including before onboarding completion. Movie cards link to public detail pages; TV and person cards also link to their public detail pages.

Views use `?view=popular&page=1`. Movies/TV genres use `?genre=28&page=1`
with their respective genre lists and discover endpoints. Selecting a view clears
the genre; changing either resets page to 1. All genres returns to Popular.
Unknown genres are cleared after the genre list loads. URL state supports reload
and Back/Forward. Pagination preserves the selected mode and is bounded to available
pages (maximum 500). Genre loading/retry is independent of the main catalog.

Discover uses `sort_by=popularity.desc`, `include_adult=false`, and disables videos
for movies or missing first-air dates for TV. List endpoints receive only language
and page; they do not support the discover filters. Returned adult items are discarded
by the shared normalizer. Genres receive only language. All requests use `en-US` and
`/api/tmdb`; static production still needs a backend/serverless proxy. No Firebase
reads or writes are added by browsing. No new dependencies are required.

## Movie details

`/movies/:movieId` is public. Canonical positive safe integer IDs are validated
before requests; invalid IDs and TMDB 404s show Movie not found without Retry.
Network/server/invalid-response errors show safe messages and Retry. A keyed,
abortable request prevents stale content during fast navigation. Document titles
follow the loaded movie and reset on navigation; movie changes scroll to the top.

One `/api/tmdb/movie/{id}` request uses `language=en-US` and exactly
`append_to_response=credits,videos,release_dates,recommendations`. The proxy allowlist
requires these parameters; credentials remain server-side. Stage 6.1 added no
Firebase operations, dependencies, TV/person detail pages or persistent TMDB data.
Static production still requires the backend/serverless `/api/tmdb` proxy.

The detail model validates optional metadata, filters malformed fields, orders and
limits cast to 12, deduplicates directors/writers, prefers US theatrical certification,
and chooses a safe YouTube video (official trailer, trailer, then teaser; key order
breaks ties). Homepage links accept only HTTP(S) without embedded credentials.
Recommendations reuse movie-card normalization and only the first page (at most 20).
Missing images have placeholders; zero/unknown monetary amounts are hidden.
Movie links work on Home, search, catalog and recommendations. Attribution is retained.

## TV show details

`/tv/:seriesId` is public. TV cards link here from Home, catalogs, search and TV
recommendations; movie links retain `/movies/:movieId`, people link to `/actors/:personId`.
One `/api/tmdb/tv/{id}` request uses `language=en-US` and exactly
`append_to_response=aggregate_credits,videos,content_ratings,recommendations`.
The existing proxy/client restrict this contract and never expose the private token.

Movie and TV share ID validation, safe trailer/homepage helpers, detail loading,
404/error/Retry, title cleanup, scroll-to-top, image fallback and stale-response
protection. Movie behavior is retained. TV normalization includes US content rating,
deduplicated creators/networks/companies/countries, first–last years for finished
shows and first–present for returning shows. Runtime uses the first valid declared
runtime, then the last episode's runtime when needed.

Aggregate cast is ordered and limited to 12; character selection prefers the role
with the most episodes, then alphabetical order. Specials (season 0) are allowed;
seasons are ordered by number in a horizontal lane so long-running shows do not
create an excessively tall page. Last/next episode summaries and seasons have no
links. Recommendations use the existing TV card model and the first page only.
Stage 6.2 added no season, episode or person detail routes, Firebase operations or new dependencies. Static production still requires a backend/serverless `/api/tmdb` proxy.


## Person details and media links

`/actors/:personId` is public. Actors/search cards, movie/TV cast, movie directors
and writers and TV creators link to person details when a valid ID is available.
The existing server proxy makes one `/person/{id}` request with `language=en-US`
and exactly `append_to_response=combined_credits,images,external_ids`.
Credentials stay server-side; static production still needs a backend/serverless
`/api/tmdb` implementation.

Person details include biography, dates (no inferred age), aliases, safe external
links, up to eight extra photos, Known For and separate Acting/Crew filmographies.
Credits exclude adult and unknown media types, merge roles by media type + ID,
and sort by date with undated works last. Known For ranks up to 12 unique works by
popularity, then vote count, with deterministic ties. Filmography starts with 12
rows per section and accessible Show all / Show less controls. Movie/TV links use
existing detail routes. Shared loading, errors, 404, Retry, abort/stale protection,
title cleanup and scroll behavior are retained. No Firebase data is read or written.


## Media library data model (Stage 7.1)

Firestore Rules добавляют приватные `users/{uid}/lists/{listId}` и
`users/{uid}/savedMedia/{mediaKey}`. Favorites/To Watch — виртуальные разделы;
один movie/TV document содержит flags и memberships в custom lists. Rules проверяют
владельца, точные поля, timestamps, immutable identity, mediaKey и отсутствие
дубликатов listIds. Тип/существование отдельных listIds и cleanup dangling references
остаются явными integrity boundaries будущего client service.

Схемы, запланированные запросы без новых composite indexes и удаление списка описаны
в [Firestore data model](docs/firestore-data-model.md#медиатека--stage-71).
Rules успешно развёрнуты только как `firestore:rules` в базе `(default)` после
445 Rules tests (208 прежних + 237 новых) и 742 unit tests. Frontend и library service
не добавлены; production documents/users не читались и не изменялись.


## Favorites and To Watch (Stage 7.2)

Movie/TV detail pages expose Favorites and Watchlist actions to signed-in users.
Guests see Log in to save and create no library subscriptions. `/library?view=favorites`
and `/library?view=watchlist` require authentication and a valid completed onboarding
profile; Library appears in the authenticated Header. Tabs, reload and history use URL state.

Membership changes use a transaction with a per-user/media lock. Other memberships
and createdAt are preserved; the last membership removal deletes the document.
Subscriptions show server-confirmed snapshots, ignore pending/cache-only data and
reattach after a transaction to avoid optimistic query removals. Errors remain local
to library UI; Retry restarts a subscription and never repeats a mutation.

Queries use one owner subcollection and one flag filter, with client-side timestamp/title
sorting. Corrupted documents are filtered; detail actions refuse corrupt saved state.
Custom-list UI, new dependencies, Rules/index changes and deployment are outside this stage.
Validation uses injected Firebase dependencies and an isolated browser fixture; no real
production user or savedMedia data is used by automated checks.
