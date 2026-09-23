# Firestore data model — Stage 7.1

История: модель onboarding этапа 3.3a. Её Rules развёрнуты в production только как
`firestore:rules` после 208 успешных Rules tests (63 прежних + 145 новых),
209 unit tests и чистого production audit. Indexes и другие ресурсы не разворачивались.
Все пути ниже используют UID текущего Firebase Auth user; реальные данные здесь не приводятся.

## Профиль и резервирование username

`users/{uid}` — точный набор полей:

| Поле | Тип / начальное значение |
| --- | --- |
| username | string, 3–20 lowercase букв `a-z`, цифр или `_` |
| displayName | string, 1–50 символов; клиент выполняет trim |
| photoURL | null при создании |
| bio | пустая string при создании |
| onboardingCompleted | boolean, false при создании |
| createdAt | serverTimestamp() |
| updatedAt | serverTimestamp() |

`usernames/{username}` — ровно `userId` (UID владельца) и `createdAt` (serverTimestamp()).
Профиль и reservation создаются атомарно, оба должны отсутствовать до записи;
Rules проверяют взаимные ссылки после записи. Email остаётся в Auth.

Профиль: get только владельцу; list/delete и обычные update запрещены.
Единственное разрешённое изменение — завершение onboarding, описанное ниже.
Username reservation: get конкретного документа доступен авторизованному пользователю
(включая проверку свободного имени); list/update/delete запрещены.

## Реакции

`users/{uid}/onboardingResponses/{responseId}` — ровно:

| Поле | Ограничение |
| --- | --- |
| tmdbId | integer > 0; строковое представление равно responseId |
| mediaType | `movie` |
| reaction | `like`, `dislike` или `skip` |
| genreIds | list длиной 0–10 |
| createdAt | serverTimestamp() при создании, затем неизменяем |
| updatedAt | serverTimestamp() при каждой записи |

`responseId` — 1–12 цифр, первая не ноль (`^[1-9][0-9]{0,11}$`).
Связь с tmdbId запрещает резервировать несколько разных ID для одного фильма.

Владелец может get/list до и после завершения onboarding. Чужой и гостевой доступ
запрещён. Collection-group queries по responses не разрешены; чтение ограничено
конкретным собственным subcollection.

Create/update разрешены только при существующем до операции собственном профиле
с `onboardingCompleted == false`. При update можно менять только reaction, genreIds
и updatedAt; полный набор полей сохраняется. tmdbId, mediaType и createdAt неизменяемы.
Delete всегда запрещён. При завершённом onboarding новые create/update запрещены.

## Итог

`users/{uid}/onboarding/summary` — ровно:

| Поле | Ограничение |
| --- | --- |
| version | integer, 1 |
| userId | UID владельца |
| status | `completed` |
| responseCount | integer, 10–30 |
| likedCount | integer, 0–responseCount |
| dislikedCount | integer, 0–responseCount |
| skippedCount | integer, 0–responseCount |
| completedAt | serverTimestamp() |
| updatedAt | serverTimestamp() |

Сумма трёх counts равна responseCount. Summary создаётся один раз; update/delete
запрещены. Владелец может get именно `summary`; list коллекции onboarding и другие
ID запрещены. Другие пользователи и гости не могут читать summary.

## Атомарное завершение

Один batch должен одновременно:

1. Создать собственный `onboarding/summary` с валидными counts и timestamps.
2. Обновить только `onboardingCompleted: false → true` и `updatedAt: serverTimestamp()`
   в существующем `users/{uid}`.

Правило summary проверяет профиль до операции и через `getAfter()` после неё.
Правило update профиля требует отсутствия summary до batch и валидный summary
после batch, включая counts, владельца и оба timestamps, равные request.time.
Запись только одной стороны, использование ранее существовавшего или чужого summary,
повторное завершение и возврат true → false запрещены. Остальные поля профиля
нельзя изменить или удалить в этом batch.

Последние responses можно включить в тот же batch: право записи проверяется по
профилю **до** операции. После commit они уже неизменяемы. Тест покрывает batch из
30 responses + summary + profile update. Все неизвестные коллекции/вложенные пути
сохраняют deny-all.

## Честные границы Rules

Rules обеспечивают authentication, ownership, точные поля, тип list и его размер,
типы и арифметику counts, неизменяемые поля, timestamps и атомарность.
Они **не проверяют**:

- тип каждого элемента genreIds, уникальность или существование жанра в TMDB;
- наличие фильма/его жанров в TMDB;
- реальное количество response-документов и соответствие counts сохранённым реакциям;
- общий предел количества response-документов в subcollection.

Клиентский сервис этапа 3.3b нормализует integer genreIds и сверяет реальные
responses/counts перед завершением. Клиентские проверки обходятся недоверенным клиентом:
они не дают серверной гарантии достоверности статистики. Тесты явно показывают, что
синтаксически корректный summary может быть принят даже без responses, а genreIds
с не-integer элементами удовлетворяет текущему ограничению list/size.

Не сохраняются title, overview, poster path/URL, rating или полный TMDB response:
такие дополнительные поля запрещены. Новые composite indexes не нужны: используются
get конкретных документов и list собственного subcollection без сложных фильтров.
`firestore.indexes.json` не изменяется.

## Проверка

`npm run test:rules` запускает только локальный Firestore Emulator для `demo-moviedna`
и затем останавливает его. Сохранены исходные 63 regression tests; новые тесты
отдельно проверяют ownership, схемы, переходы состояния, атомарность и границы Rules.
Тесты не используют production Firebase. При deployment production documents/users
не читались и не изменялись; проверялись только доступность проекта и метаданные базы.

Основания: [Rules conditions/getAfter](https://firebase.google.com/docs/firestore/security/rules-conditions),
[ограничения полей](https://firebase.google.com/docs/firestore/security/rules-fields),
[Rules unit testing](https://firebase.google.com/docs/rules/unit-tests),
[batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Клиентский flow этапа 3.3b

Модель документов и Rules не меняются. Service проверяет текущего Auth user, UID,
positive safe integer tmdbId в допустимом 12-значном диапазоне, mediaType movie,
reaction и массив positive safe integer genreIds (до 10, дубликаты удаляются).
Повреждённые сохранённые документы отклоняются целиком без вывода содержимого.

Каждая реакция сохраняется transaction: существующий response обновляет только
reaction/genreIds/updatedAt, новый получает createdAt и updatedAt через serverTimestamp.
После подтверждения записи UI переходит к следующему фильму. Ошибки не двигают колоду.

Перед Finish сервис заново выполняет getDocsFromServer собственного subcollection,
проверяет точные поля, ID/tmdbId и timestamps, вычисляет counts. Требуются 10–30 responses
и **минимум 5 содержательных реакций (like + dislike)**. Дополнительно проверяется,
что профиль ещё не завершён и summary отсутствует. Один WriteBatch без merge создаёт
summary и обновляет только onboardingCompleted и updatedAt. Повторное завершение
даёт безопасную ошибку. Редирект выполняется существующим guard по подтверждённому
профилю, не оптимистически по локальному pending-write snapshot.

Rules проверяют 10–30 total и арифметическую сумму, но **не гарантируют минимум 5
like/dislike** и достоверность counts. Это клиентское ограничение обходится изменённым
клиентом. Чтение responses и последующий WriteBatch не образуют транзакционную блокировку
всей коллекции: другая вкладка может изменить реакции между чтением и commit.
В этой модели нельзя обещать серверную согласованность counts с коллекцией при такой
конкуренции. Rules всё равно запрещают любые response writes после завершения,
повторный summary и изменение остальных полей профиля.

## Медиатека — Stage 7.1

Rules успешно скомпилированы и опубликованы только как `firestore:rules` в `(default)`.
Проверки: 208 прежних + 237 новых Rules tests, 742 unit tests; production audit чистый.
Production documents/users не читались и не изменялись; indexes и другие сервисы не разворачивались.

Favorites и To Watch — виртуальные разделы, а не list documents. Один документ
`users/{uid}/savedMedia/{mediaKey}` представляет один фильм или сериал и может
одновременно входить в оба раздела и несколько custom lists. Списки приватны;
публичного sharing и collection-group доступа нет.

### Custom lists

`users/{uid}/lists/{listId}`. ID соответствует `^[A-Za-z0-9]{20}$` (формат Firestore
auto-ID; случайность генерации Rules не доказывают). Точные поля:

| Поле | Rules |
| --- | --- |
| name | string 1–60, не только пробельные символы |
| description | string 0–300 |
| createdAt | timestamp, request.time при create; неизменяем при update |
| updatedAt | timestamp, request.time при create/update |

Get/list/create/update/delete только при `request.auth.uid == uid`. Неизвестные
поля запрещены, update повторно проверяет весь итоговый документ. Имена не уникальны.
Право на собственную медиатеку не зависит от существования профиля или completion
onboarding: дополнительные ограничения этого этапа не вводятся.

### Saved media

`users/{uid}/savedMedia/{mediaKey}`. Точный набор:

| Поле | Rules |
| --- | --- |
| tmdbId | int 1–999999999999, неизменяем |
| mediaType | movie или tv, неизменяем |
| title | string 1–200, не только пробельные символы |
| posterPath | null или относительный путь до 200 символов, подробнее ниже |
| releaseYear | null или int 1800–2200 |
| favorite | bool |
| watchlist | bool |
| listIds | list, 0–20 элементов, без дубликатов по семантике Rules Set |
| createdAt | timestamp, request.time при create; неизменяем |
| updatedAt | timestamp, request.time при create/update |

Ключ проходит `^(movie|tv)_[1-9][0-9]{0,11}$` **и** равен
`mediaType + '_' + string(tmdbId)`. Встроенное преобразование ограниченного integer
даёт канонический десятичный ID; несовпадающие тип/число, leading zero и 13 цифр
покрыты отрицательными Emulator tests. Эта связь гарантируется Rules, а не клиентом.

Хотя бы одна membership обязательна: favorite, watchlist или непустой listIds.
Удаление последней membership через update отклоняется; следует удалить документ.
Все поля повторно валидируются при update. Get/list/create/update/delete доступны
только владельцу. Родительские profiles/usernames и onboarding Rules не изменены;
неизвестные и более глубокие вложенные пути остаются deny-all.

Poster использует намеренно узкий набор ASCII-символов: `/`, буквы, цифры, `_`, `.`,
`-`; начинается с `/`, содержит ещё хотя бы один символ и не содержит `..`.
Протоколы, query, fragment, backslash, whitespace и произвольные внешние URL запрещены.
Это проверка формы пути, а не существования изображения в TMDB.

Храним только минимальный display snapshot: title, posterPath, releaseYear. Он
позволяет показать сохранённое media без detail-запроса на каждую строку, но может
устареть или быть подделан владельцем. Cast, overview, ratings, videos и остальные
подробности продолжают загружаться из TMDB. Rules не проверяют TMDB existence или
достоверность snapshot; разрешены только movie/TV, не person.

### Integrity boundaries

`listIds.toSet().size() == listIds.size()` исключает дубликаты. Rules не предоставляют
общего цикла/предиката для проверки каждого динамического элемента списка.
Технически можно вручную развернуть проверки всех 20 позиций; здесь это намеренно
не делается, чтобы не создавать громоздкие правила. **Тип/regex отдельного listId и
существование custom list не гарантируются.** Тест явно подтверждает принятие
списка с числом, null и невалидной строкой; это не обещание будущего клиентского API.
Клиентский service должен проверять каждый ID, существование собственных списков,
дедупликацию и корректность snapshot. Такой service на этапе 7.1 не реализуется.

Rules не сканируют коллекции и не гарантируют отсутствие dangling references после
удаления списка. Все эти документы всё равно доступны только владельцу: ссылка на
чужой/несуществующий ID не даёт доступа к чужим данным. Owner-only — security
boundary; корректность содержимого/ссылок сверх проверенной схемы — integrity boundary.
Нет гарантии количества списков/документов, уникальности имён или актуальности TMDB.

### Будущие запросы и индексы

Все запросы направлены в конкретный собственный subcollection:

- Favorites: `users/{uid}/savedMedia`, `where('favorite', '==', true)`.
- To Watch: тот же путь, `where('watchlist', '==', true)`.
- Custom list: тот же путь, `where('listIds', 'array-contains', listId)`.
- Custom lists: `users/{uid}/lists`.

Сортировка по updatedAt/createdAt будет клиентской, без серверного orderBy.
При стандартной автоматической индексации Firestore Standard эти одиночные фильтры
используют single-field indexes (включая array-contains). Новые composite indexes
не нужны; `firestore.indexes.json` не изменён и не содержит fieldOverrides.
Emulator подтверждает разрешение запросов Rules, но не служит доказательством
production index coverage — вывод основан на документированных типах индексов.

### Будущее удаление custom list

1. Запросить собственные savedMedia с `array-contains listId`.
2. Убрать ID из каждого документа, сохранив другие memberships.
3. Если favorite/watchlist false и listIds пуст, удалить savedMedia вместо update.
4. Удалить metadata document списка.

Для небольшого набора возможен один batch. Нужно учитывать технические лимиты
Firestore/SDK, размер запроса (10 MiB), количество операций и ограничения Rules
на document-access calls, если будущие правила начнут делать get/exists.
Для больших списков нужны несколько batches либо будущая server-side cleanup.
Несколько batches не атомарны как целое; между query и записью другой клиент может
добавить membership. Нужны повторяемая очистка и работа с конкурирующими изменениями.
Rules не обеспечивают каскадное удаление и не блокируют dangling references.
UI, library service и cleanup на этом этапе отсутствуют.

Источники: [Rules field/type validation](https://firebase.google.com/docs/firestore/security/rules-fields),
[List.toSet](https://firebase.google.com/docs/reference/rules/rules.List),
[automatic single-field indexes](https://firebase.google.com/docs/firestore/query-data/index-overview),
[batched writes and limits](https://firebase.google.com/docs/firestore/manage-data/transactions).
