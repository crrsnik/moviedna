# Firestore data model — Stage 8.1

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
Клиентский service этапа 7.3 проверяет каждый ID и существование собственных списков;
он также отвергает повторяющиеся ID и проверяет snapshot. Эти клиентские проверки
не заменяют серверные Security Rules.

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

### Удаление custom list

Реализованный transaction cleanup и его границы описаны ниже в Stage 7.3.
Rules не обеспечивают каскадное удаление и не блокируют dangling references.

Источники: [Rules field/type validation](https://firebase.google.com/docs/firestore/security/rules-fields),
[List.toSet](https://firebase.google.com/docs/reference/rules/rules.List),
[automatic single-field indexes](https://firebase.google.com/docs/firestore/query-data/index-overview),
[batched writes and limits](https://firebase.google.com/docs/firestore/manage-data/transactions).


## Реализованный client flow — Stage 7.2

Schema и Rules этапа 7.1 не изменены. Сервис формирует канонический mediaKey и сохраняет
только tmdbId/mediaType/title/posterPath/releaseYear плюс membership flags/listIds/timestamps.
Перед любым Firestore-доступом проверяются UID текущей Auth-сессии и media identity.
`runTransaction` читает один savedMedia document, повторно проверяет сессию и
валидирует существующий документ. Новый получает второй flag false, пустой listIds
и два serverTimestamp. Update меняет только выбранный flag, актуальные display-поля
и updatedAt; другой flag, listIds и createdAt сохраняются. При отсутствии memberships
выполняется delete. Remove из library задаёт false явно: повторное удаление не добавляет
документ обратно. Transaction retries используют последний прочитанный документ.

Клиент проверяет тип/формат каждого listId и не изменяет listIds на этом этапе;
существование списков не проверяется, dangling references не очищаются. Повреждённые
savedMedia запрещены для toggle и пропускаются при отображении коллекции.
Между завершением Auth-сессии и уже отправленным commit нет механизма отмены Firebase:
проверки до/после чтения и после commit предотвращают продолжение в новой сессии и
stale UI, но не обещают rollback уже принятой сервером записи. При logout подписки
отключаются, предыдущие данные немедленно скрываются по UID.

Один lock на UID/mediaKey и UI lock блокируют повторные/конфликтующие нажатия.
Локальные pending writes и cache-only snapshots не считаются подтверждением сервера.
На время transaction подписки этого UID удерживают прежнее состояние; после её
завершения подписки пересоздаются для подтверждённого server snapshot. Это важно для
query removals: удалённый локально документ уже может отсутствовать в result set,
поэтому одного hasPendingWrites у query недостаточно. Retry только переподписывается.
В offline-режиме начальная подписка может оставаться в loading до связи с сервером;
медиатека не выдаёт cache за подтверждённое состояние.

Favorites/Watchlist queries не используют orderBy. Сортировка идёт по updatedAt,
createdAt (с сохранением nanoseconds), затем title и mediaKey. Custom lists и cleanup добавлены в Stage 7.3 ниже.


## Реализованный client flow — Stage 7.3

Custom-list operations расширяют существующий mediaLibraryService и используют
общие owner/session checks, блокировки и обработку ошибок. До Firestore проверяются
UID текущей сессии, 20-символьный ASCII auto-ID и входные поля. Create генерирует
Firestore auto-ID и записывает только name/description/createdAt/updatedAt; текст
trim, длины 1–60 и 0–300. Update не меняет createdAt. Одинаковые имена разрешены.

Owner-scoped lists subscription не использует collection-group или orderBy;
повреждённые документы отбрасываются, сортировка createdAt по возрастанию, затем
name/id. Custom-list items используют один `array-contains` на listIds и существующую
нормализацию/сортировку savedMedia. Composite indexes не добавлены. Pending/cache
snapshots не считаются подтверждением сервера; logout, UID/listId change и unmount
отключают подписки и скрывают прежние данные. Retry подписок повторяет только чтение.

### Membership transaction

Manage lists хранит checkbox draft до Save. Одна transaction читает текущий savedMedia
и все выбранные list documents до любых writes, проверяет их существование и схему.
Максимум 20 уникальных валидных ID. Сохраняются favorite/watchlist/createdAt;
обновляются display snapshot, listIds и updatedAt. Новый документ получает false
flags и server timestamps. Пустой набор без других memberships означает delete.
Remove from list перечитывает документ и удаляет только нужный ID; отсутствие
документа или membership — безопасный no-op. Повреждённый savedMedia не перезаписывается.

### Удаление и повтор

Подтверждение явно предупреждает о многошаговой операции. На время удаления общий
service lock блокирует новые library mutations этого UID в текущей вкладке; modal
блокирует конфликтующие UI-действия. Удаление не начинает cleanup при уже выполняющейся
mutation. Query читает максимум 100 references, каждый savedMedia перечитывается
отдельной transaction, сохраняющей актуальные flags и другие listIds. Если memberships
не остаётся — delete. Не используется blind delete из первоначального snapshot.

За попытку обрабатывается максимум 10 групп (до 1000 документов), затем выполняется
повторный server query `limit(1)`. Если references остались либо шаг завершился ошибкой,
metadata сохраняется, UI показывает безопасную partial-cleanup ошибку. Пользователь
может явно повторить Delete: уже очищенные/удалённые документы не мешают продолжению.
Лишь после пустого повторного query metadata удаляется отдельной transaction.
Это не атомарная операция на весь список, и Cancel после failure не откатывает уже
подтверждённые удаления memberships. На успешном завершении URL возвращается к Favorites.

### Честная граница между вкладками

Проверка существования list documents в membership transaction защищает от добавления
в уже удалённый список, но не закрывает окно между последним cleanup query и metadata
commit: другая вкладка может успеть добавить membership. Rules не проверяют existence
каждого listId и не предоставляют блокировку удаления; поэтому полное отсутствие
dangling references не гарантируется. UI позволяет убрать отсутствующие списки из
черновика Manage lists и явно сохранить изменения. Полноценная серверная координация
не входит в этот этап. Операции приватны; public sharing отсутствует.


## Ratings and comments — Stage 8.1

Реализованы модель, Security Rules и Emulator tests. После повторных проверок
опубликованы только `firestore:rules` в проверенный проект и базу `(default)`.
Frontend и services в этот этап не входят; indexes и другие ресурсы не разворачивались. Поддерживаются movie/TV, но не
person/actor. Rating и comment независимы: наличие оценки не требуется для комментария.
Один Firebase UID может иметь максимум один документ каждого типа на один mediaKey;
это не ограничение на количество разных аккаунтов одного человека.

### Общая media identity

`mediaKey` соответствует `^(movie|tv)_[1-9][0-9]{0,11}$` и **точно равен**
`mediaType + '_' + string(tmdbId)`. `tmdbId` — integer 1–999999999999,
`mediaType` — только `movie` или `tv`. Ведущий ноль, дробь, отрицательное число,
экспоненциальная запись и другой префикс запрещены.

Helpers identity/title/poster/year извлечены из savedMedia без изменения его
семантики, полей, memberships, timestamps или доступа. Rules не подтверждают
существование media в TMDB и не проверяют достоверность display snapshot.

### Ratings: точная схема

Путь: `users/{uid}/ratings/{mediaKey}`. Другие поля запрещены.

| Поле | Ограничение |
| --- | --- |
| tmdbId | integer 1–999999999999; согласован с mediaKey |
| mediaType | `movie` / `tv`; согласован с mediaKey |
| title | string длиной 1–200 с непробельным символом |
| posterPath | null или относительный path: `/` + непустые ASCII `A-Za-z0-9_./-`, максимум 200 символов, без `..`; те же правила, что savedMedia |
| releaseYear | null или integer 1800–2200 |
| score | integer 1–10, не float/string/boolean |
| createdAt | timestamp, при create равен request.time, далее неизменяем |
| updatedAt | timestamp, при каждом create/update равен request.time |

Get/list/create/update/delete разрешены только владельцу пути uid. Гость и другой
пользователь не имеют доступа; collection-group ratings не разрешён. Create/update
дополнительно проверяют уже существующий профиль с `onboardingCompleted == true`
через get/exists, а не getAfter: завершение onboarding в том же batch недостаточно.
Update повторно валидирует весь документ, запрещает изменение tmdbId/mediaType/createdAt,
но разрешает score и валидный snapshot refresh. Get/list/delete не требуют наличия
профиля или завершённого onboarding, чтобы владелец мог прочитать/удалить свою оценку.

### Comments: точная схема

Путь: `mediaComments/{mediaKey}/comments/{commentAuthorId}`.
`commentAuthorId` — Firebase UID автора, проверяемый через request.auth.uid при записи.
Только эти восемь полей разрешены:

| Поле | Ограничение |
| --- | --- |
| tmdbId | integer 1–999999999999; согласован с mediaKey |
| mediaType | `movie` / `tv`; согласован с mediaKey |
| authorUsername | string, при create точно равен users/{commentAuthorId}.username |
| authorDisplayName | string, при create точно равен users/{commentAuthorId}.displayName |
| text | string 1–2000 с хотя бы одним непробельным символом |
| containsSpoiler | boolean |
| createdAt | timestamp, при create равен request.time, далее неизменяем |
| updatedAt | timestamp, при каждом create/update равен request.time |

Create разрешён только автору с существующим завершённым профилем. Проверка профиля
не делает его публично читаемым. Update разрешён только автору; итоговая схема и типы
валидируются полностью, affectedKeys ограничены text/containsSpoiler/updatedAt.
Identity, оба поля автора и createdAt неизменяемы. Update не требует повторного
совпадения с текущим профилем: будущий rename профиля не должен блокировать правку
текста или переписывать исторический snapshot. Delete — только автору. Существующий
комментарий можно править/удалять при том же Auth UID даже после административного
удаления профиля; публичность существующего комментария от профиля не зависит.

### Публичное чтение и порядок выдачи

Get отдельного comment document публичен гостям и авторизованным пользователям.
List публичен **только при явно указанном integer limit от 1 до 20**. Отсутствующий
limit и limit >20 запрещены. Это лимит одной страницы, не rate limit и не защита от
последовательного скачивания всех публичных комментариев.

Используется разрешённый fallback: порядок выдачи — контракт клиента, не гарантия
Rules. Локальный Emulator показал, что `request.query.orderBy` представлен map полей
и направлений; запросы с `updatedAt desc` первым и `__name__ desc` первым могут давать
одинаковый map. Проверка такого map не доказывает приоритет полей. Поэтому не добавлена
хрупкая проверка порядка: ограниченные запросы без сортировки или с другой сортировкой
также разрешены, что явно покрыто тестами. Будущий UI использует updatedAt descending.
Фильтры/направление/курсор не ограничены дополнительно; limit остаётся обязательным.

Прямые get/list/write parent `mediaComments/{mediaKey}` запрещены. Другие subcollections,
вложенные private paths и collection-group comments не разрешены. Deny-by-default
остаётся для всего вне явно перечисленных путей. Публичность comment не открывает
чтение users, ratings, savedMedia, lists или onboarding.

### План запросов и indexes

| Назначение | Запрос |
| --- | --- |
| Личные оценки | `users/{uid}/ratings` (owner collection) |
| Оценка текущего media | get `users/{uid}/ratings/{mediaKey}` |
| Публичные комментарии | `mediaComments/{mediaKey}/comments`, orderBy updatedAt desc, limit 20 |
| Следующая страница | тот же query + startAfter последнего snapshot, limit 20 |
| Собственный комментарий | get `mediaComments/{mediaKey}/comments/{uid}` |

Collection-group queries не создаются. Для запланированной выдачи достаточно обычного
collection-scope single-field descending index updatedAt при стандартной автоматической
индексации. Composite index не нужен, `firestore.indexes.json` не изменён. Emulator
проверяет Rules, но не доказывает наличие production indexes; вывод об индексе основан
на [официальной документации индексов](https://firebase.google.com/docs/firestore/query-data/index-overview).
Про request.query: [Firebase Rules reference](https://firebase.google.com/docs/reference/rules/rules.firestore.Request),
[ограничения запросов](https://firebase.google.com/docs/firestore/security/rules-query).

### Privacy / integrity / moderation boundaries

- Ratings приватны. Нет публичного MovieDNA average/aggregate или статистики.
  Личная оценка не изменяет и не заменяет TMDB rating.
- Comments публичны, включая **Firebase UID в пути** и username/displayName snapshot.
  Это позволяет связывать публичные комментарии одного аккаунта; приватность UID не обещается.
- Email, token, photoURL, bio и прочие Auth/profile поля в схему не входят и как
  дополнительные поля отклоняются. Текст и displayName пользователь вводит сам:
  Rules не могут запретить пользователю вручную вписать личные данные в разрешённый текст.
- Snapshot автора подтверждается при создании и не обновляется автоматически после
  будущего изменения профиля. Удаление профиля не каскадно удаляет публичные comments.
- Moderation backend отсутствует. Размер, структура и авторство не означают проверку
  оскорбительного/незаконного контента, истинности или корректности containsSpoiler.
- Будущий UI обязан выводить text **только как текст**, без HTML/dangerouslySetInnerHTML.
  Rules не являются HTML sanitizer: буквальный markup допустим как строка.
- UI, rating/comment services, actor ratings/comments, profiles/friends и другие
  следующие этапы не реализованы. Production documents/users не читались и не изменялись.

Проверки Stage 8.1: 445 прежних Rules tests сохранены без изменения поведения;
323 новых, всего 768/768. Unit tests: 935/935. Тесты используют только локальный
Firestore Emulator `demo-moviedna`; fixtures синтетические, production данные не используются.


## MovieDNA — Stage 9.2

Stage 9.2 резервирует три server-authored пути. Calculation library, Functions,
TMDB enrichment и UI ещё не реализованы. Admin SDK будущего backend обходит клиентские
Rules; клиент не может создавать очередь или подделывать рассчитанный результат.

### Приватный результат

Путь: `users/{uid}/movieDna/current`. Только эти top-level поля входят в schema v1:

| Поле | Тип / ограничение |
| --- | --- |
| schemaVersion | integer `1` |
| algorithmVersion | version string; первая версия `1.0.0` |
| status | `ready` / `insufficient-data` |
| inputFingerprint | `sha256:` + 64 lowercase hex |
| sourceCounts | точная map из 12 non-negative integer counters |
| metadataCoverage | number 0–1 |
| confidence | number 0–1 |
| dimensions | точная map из восьми ограниченных arrays |
| calculatedAt | timestamp |
| updatedAt | timestamp, не раньше calculatedAt |

`sourceCounts`: `ratingsRead`, `onboardingRead`, `favoritesRead`,
`uniqueNonZeroUsed`, `ratingUsed`, `onboardingUsed`, `favoriteUsed`,
`neutralOrSkipped`, `shadowedByHigherPriority`, `discardedSourceCount`,
`enrichedUsed`, `unavailableMetadata`.

`dimensions`: `genres`, `mediaTypes`, `decades`, `languages`, `countries`,
`directors`, `creators`, `actors`. Максимум 20 элементов на dimension, для
`mediaTypes` максимум 2. Каждый элемент содержит ровно:

```js
{
  key,
  label,
  signedContribution,
  absoluteEvidenceWeight,
  score,
  evidenceCount,
  confidence
}
```

`key` — стабильный namespaced ID до 80 символов, `label` — display snapshot до
100 символов, `signedContribution` — finite signed number,
`absoluteEvidenceWeight` — finite non-negative number, `score` — finite number
`[-1, 1]`, `evidenceCount` — positive integer, `confidence` — finite number `[0, 1]`.
Все вычисляемые числа округлены до шести знаков. Форматы key: `genre:{id}`,
`media:movie|tv`, `decade:{YYYY}`, `language:{aa}`, `country:{AA}` и
`person:{tmdbPersonId}`. Actor dimension использует максимум три top-billed actors
одного media, multiplier 0.5 и требует повторения person минимум в двух media.

### Состояние пересчёта

Путь: `users/{uid}/movieDna/recalculation`. Точный набор:

| Поле | Тип / ограничение |
| --- | --- |
| schemaVersion | integer `1` |
| status | `queued`, `running`, `succeeded`, `failed` |
| requestedAt | timestamp |
| startedAt | timestamp / null |
| completedAt | timestamp / null |
| nextEligibleAt | timestamp |
| algorithmVersion | version string |
| inputFingerprint | SHA-256 fingerprint / null до normalization |
| errorCode | null / allowlisted safe code без stack trace |

Queued не имеет start/completion, running имеет start, terminal state имеет оба.
Только failed содержит errorCode. Event-driven job является основным механизмом;
будущий manual Refresh вызывает callable Function и не пишет этот документ. Cooldown,
fingerprint и один active job обеспечивают deduplication/idempotency.

### Закрытый cache TMDB-признаков

Путь: `mediaSignals/{mediaKey}`. `mediaKey` строго равен
`mediaType + '_' + string(tmdbId)` и соответствует
`^(movie|tv)_[1-9][0-9]{0,11}$`. Документ содержит ровно:

| Поле | Тип / ограничение |
| --- | --- |
| schemaVersion | integer `1` |
| tmdbId / mediaType | canonical positive ID и `movie`/`tv`, согласованные с path |
| genreIds | unique positive integers, максимум 20 |
| releaseYear | null / integer 1800–2200, source для decade |
| originalLanguage | null / lowercase two-letter code |
| countryCodes | unique uppercase two-letter codes, максимум 20 |
| directors | movie `{id,name}` array, максимум 10; для TV пустой |
| creators | TV `{id,name}` array, максимум 10; для movie пустой |
| actors | максимум три unique `{id,name,billingOrder}`, order 0–2 |
| fetchedAt / expiresAt | timestamps, expiresAt позже fetchedAt |
| metadataStatus | `ready`, `partial`, `missing`, `temporary-error` |
| metadataCompleteness | exact boolean map: genres, releaseYear, originalLanguage, countries, people |

Person IDs положительные, names — trimmed display snapshots до 100 символов.
Popularity, vote count, keywords, overview, biography, images, videos, full credits и
raw TMDB payload не сохраняются. Перед Stage 9.4 нужно повторно проверить актуальные
TMDB API terms, attribution и допустимые условия/TTL постоянного metadata cache.

### Доступ и индексы

- Владелец может только `get` собственные `current` и `recalculation`.
- Owner list и все client create/update/delete запрещены.
- Guest и другой пользователь не могут читать или писать эти документы.
- Любые другие `movieDna/{documentId}` и nested paths остаются deny-by-default.
- `mediaSignals` полностью закрыт для guest и любого authenticated client:
  get/list/create/update/delete запрещены.
- Существующий public profile не раскрывает MovieDNA. Будущая публикация потребует
  отдельного opt-in projection и отдельных Rules.

Rules намеренно не валидируют внутреннюю server-only schema при записи: клиентские
write всегда false, а Admin SDK не применяет client Rules. Schema должен строго
валидировать будущий backend и его tests. Прямые get конкретных DNA documents и
Admin direct gets cache не требуют composite indexes. `firestore.indexes.json`
остаётся без изменений; index добавляется только под доказанный будущий query.

Functions 2nd gen планируются в `europe-west6`. Production deploy возможен только
после Blaze и budget protection. Полное удаление аккаунта до production должно
серверно удалить оба private MovieDNA documents; общий `mediaSignals` не содержит UID.
