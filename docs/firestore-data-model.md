# Firestore data model — Stage 3.3a

Модель onboarding этапа 3.3a. Rules развёрнуты в production только как
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
