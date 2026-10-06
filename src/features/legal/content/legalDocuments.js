const UPDATED = Object.freeze({
  en: 'October 6, 2026',
  fr: '6 octobre 2026',
  ru: '6 октября 2026 г.',
})

const documents = Object.freeze({
  en: {
    terms: {
      title: 'Terms of Use',
      updatedLabel: 'Last updated',
      intro:
        'These Terms of Use govern your access to and use of MovieDNA. By creating an account or using MovieDNA, you agree to these Terms.',
      sections: [
        {
          title: '1. The MovieDNA service',
          paragraphs: [
            'MovieDNA is a movie and TV discovery platform that lets you build a preference profile, receive personalized recommendations, rate and save titles, maintain viewing activity, create collections, and use social features.',
            'MovieDNA may change, add, remove, or improve features over time.',
          ],
        },
        {
          title: '2. Your account',
          paragraphs: [
            'You are responsible for providing accurate registration information and for keeping access to your account secure.',
            'You must not impersonate another person, create accounts for abusive purposes, or attempt to access another user’s account.',
          ],
        },
        {
          title: '3. Acceptable use',
          paragraphs: [
            'You may not use MovieDNA to violate applicable law, interfere with the service, abuse other users, distribute malicious content, or attempt to bypass security or access controls.',
            'Automated scraping, unauthorized reverse engineering, and attempts to overload or disrupt MovieDNA are prohibited except where applicable law expressly permits otherwise.',
          ],
        },
        {
          title: '4. User content and social features',
          paragraphs: [
            'MovieDNA may allow you to publish or share content such as comments, profile information, and public collections. You remain responsible for content you submit.',
            'Content you make public may be visible to other MovieDNA users. You should not publish information that you do not want others to see.',
            'MovieDNA may restrict or remove content or accounts when reasonably necessary to protect users, enforce these Terms, or comply with applicable law.',
          ],
        },
        {
          title: '5. Recommendations and catalog information',
          paragraphs: [
            'MovieDNA recommendations are generated from available preference and activity signals. They are suggestions only and are not guaranteed to match your tastes.',
            'Some movie, TV, person, image, and catalog information is provided through third-party data services. MovieDNA cannot guarantee that third-party information is always complete, current, or error-free.',
          ],
        },
        {
          title: '6. Availability',
          paragraphs: [
            'We aim to keep MovieDNA available and reliable, but uninterrupted or error-free access is not guaranteed.',
            'Features may occasionally be unavailable because of maintenance, technical issues, security measures, third-party services, or product changes.',
          ],
        },
        {
          title: '7. Account suspension and deletion',
          paragraphs: [
            'You may stop using MovieDNA at any time and may use the available account deletion controls to request deletion of your account.',
            'MovieDNA may restrict or terminate access where necessary because of serious misuse, security risks, repeated violations of these Terms, or legal requirements.',
          ],
        },
        {
          title: '8. Disclaimer and responsibility',
          paragraphs: [
            'MovieDNA is provided on an as-available basis. To the extent permitted by applicable law, MovieDNA does not guarantee that every feature, recommendation, or third-party catalog item will always be accurate or available.',
            'Nothing in these Terms excludes rights or protections that cannot legally be excluded.',
          ],
        },
        {
          title: '9. Changes to these Terms',
          paragraphs: [
            'These Terms may be updated when MovieDNA changes or when legal or operational requirements make an update necessary. The date shown at the top of this page indicates the latest revision.',
          ],
        },
      ],
    },

    privacy: {
      title: 'Privacy Policy',
      updatedLabel: 'Last updated',
      intro:
        'This Privacy Policy explains what information MovieDNA uses, why it is used, and the choices available to you when you use the service.',
      sections: [
        {
          title: '1. Information used by MovieDNA',
          paragraphs: [
            'Account information may include your email address, username, display name, account identifiers, profile settings, and selected avatar.',
            'Movie and TV activity may include ratings, favorites, watchlist entries, viewing history, onboarding and DNA-refinement responses, collections, and recommendation interactions.',
            'Social features may process friendship information, comments, public profile information, notifications, and collections that you choose to make public.',
            'Technical and security information may be processed as necessary to authenticate users, protect MovieDNA, prevent abuse, diagnose errors, and operate the service.',
          ],
        },
        {
          title: '2. How information is used',
          paragraphs: [
            'MovieDNA uses account information to provide authentication and account features.',
            'Your movie and TV activity is used to build and update your MovieDNA profile, provide recommendations, maintain your library and history, and show statistics and achievements.',
            'Information is also used to secure the service, investigate errors, prevent misuse, and maintain product functionality.',
          ],
        },
        {
          title: '3. Service providers and catalog data',
          paragraphs: [
            'MovieDNA uses Firebase and Google Cloud services for functions such as authentication, database storage, backend processing, hosting, and application security.',
            'MovieDNA uses TMDB data and images to provide movie, TV, and person catalog information. Requests to catalog services may therefore involve third-party infrastructure.',
          ],
        },
        {
          title: '4. Public and private information',
          paragraphs: [
            'Your account settings determine whether supported profile information is public or private.',
            'Public profiles, public collections, and comments may be visible to other users. Private account data and private library information are not intended to be displayed publicly.',
          ],
        },
        {
          title: '5. Data retention and account deletion',
          paragraphs: [
            'MovieDNA keeps information while it is needed to operate your account and the features you use.',
            'When you request account deletion through the available account controls, MovieDNA will attempt to remove account-related MovieDNA data according to the deletion process implemented by the service.',
            'Some information may need to remain temporarily where required for security, technical integrity, backups, fraud prevention, or applicable legal obligations.',
          ],
        },
        {
          title: '6. Your choices',
          paragraphs: [
            'You can control supported profile privacy settings, remove saved titles and activity where the interface allows it, and delete your MovieDNA account using the available account settings.',
            'Depending on applicable law, you may also have rights concerning access, correction, deletion, restriction, or portability of personal data.',
          ],
        },
        {
          title: '7. Security',
          paragraphs: [
            'MovieDNA uses authentication, access-control rules, application integrity checks, and backend validation intended to protect account and service data.',
            'No online service can guarantee absolute security, so you should also protect your password and devices.',
          ],
        },
        {
          title: '8. Children',
          paragraphs: [
            'MovieDNA is not intended to override age or parental-consent requirements that apply where you live. Users must be legally able to create and use an account under applicable law.',
          ],
        },
        {
          title: '9. Changes to this Policy',
          paragraphs: [
            'This Privacy Policy may be updated when MovieDNA features, data practices, or applicable requirements change. The revision date at the top of this page shows when it was last updated.',
          ],
        },
      ],
    },
  },

  fr: {
    terms: {
      title: 'Conditions d’utilisation',
      updatedLabel: 'Dernière mise à jour',
      intro:
        'Les présentes Conditions d’utilisation régissent votre accès à MovieDNA et son utilisation. En créant un compte ou en utilisant MovieDNA, vous acceptez ces Conditions.',
      sections: [
        {
          title: '1. Le service MovieDNA',
          paragraphs: [
            'MovieDNA est une plateforme de découverte de films et de séries qui permet de créer un profil de préférences, de recevoir des recommandations personnalisées, de noter et enregistrer des titres, de conserver un historique de visionnage, de créer des collections et d’utiliser des fonctions sociales.',
            'MovieDNA peut modifier, ajouter, supprimer ou améliorer certaines fonctionnalités au fil du temps.',
          ],
        },
        {
          title: '2. Votre compte',
          paragraphs: [
            'Vous êtes responsable de l’exactitude des informations fournies lors de l’inscription et de la sécurité de l’accès à votre compte.',
            'Vous ne devez pas usurper l’identité d’une autre personne, créer un compte à des fins abusives ni tenter d’accéder au compte d’un autre utilisateur.',
          ],
        },
        {
          title: '3. Utilisation acceptable',
          paragraphs: [
            'Vous ne pouvez pas utiliser MovieDNA pour enfreindre la loi applicable, perturber le service, harceler d’autres utilisateurs, diffuser du contenu malveillant ou contourner les mesures de sécurité et de contrôle d’accès.',
            'Le scraping automatisé, la rétro-ingénierie non autorisée et les tentatives de surcharge ou de perturbation de MovieDNA sont interdits, sauf lorsque la loi applicable l’autorise expressément.',
          ],
        },
        {
          title: '4. Contenu utilisateur et fonctions sociales',
          paragraphs: [
            'MovieDNA peut vous permettre de publier ou partager du contenu, notamment des commentaires, des informations de profil et des collections publiques. Vous restez responsable du contenu que vous publiez.',
            'Le contenu que vous rendez public peut être visible par d’autres utilisateurs de MovieDNA. Ne publiez pas d’informations que vous ne souhaitez pas rendre visibles.',
            'MovieDNA peut limiter ou supprimer du contenu ou des comptes lorsque cela est raisonnablement nécessaire pour protéger les utilisateurs, faire respecter ces Conditions ou respecter la loi applicable.',
          ],
        },
        {
          title: '5. Recommandations et informations du catalogue',
          paragraphs: [
            'Les recommandations MovieDNA sont générées à partir des signaux de préférences et d’activité disponibles. Elles constituent uniquement des suggestions et ne garantissent pas qu’un contenu vous plaira.',
            'Certaines informations sur les films, séries, personnes et images proviennent de services de données tiers. MovieDNA ne peut pas garantir que ces informations soient toujours complètes, actuelles ou exemptes d’erreurs.',
          ],
        },
        {
          title: '6. Disponibilité',
          paragraphs: [
            'Nous cherchons à maintenir MovieDNA disponible et fiable, mais un accès ininterrompu ou exempt d’erreurs ne peut pas être garanti.',
            'Certaines fonctions peuvent être temporairement indisponibles en raison de maintenance, de problèmes techniques, de mesures de sécurité, de services tiers ou d’évolutions du produit.',
          ],
        },
        {
          title: '7. Suspension et suppression du compte',
          paragraphs: [
            'Vous pouvez cesser d’utiliser MovieDNA à tout moment et utiliser les contrôles disponibles pour demander la suppression de votre compte.',
            'MovieDNA peut limiter ou supprimer un accès en cas d’utilisation abusive grave, de risque de sécurité, de violations répétées de ces Conditions ou d’obligations légales.',
          ],
        },
        {
          title: '8. Limites et responsabilités',
          paragraphs: [
            'MovieDNA est fourni selon sa disponibilité. Dans les limites autorisées par la loi applicable, MovieDNA ne garantit pas que toutes les fonctions, recommandations ou informations provenant de tiers seront toujours exactes ou disponibles.',
            'Aucune disposition des présentes Conditions n’exclut les droits ou protections qui ne peuvent légalement être exclus.',
          ],
        },
        {
          title: '9. Modification des Conditions',
          paragraphs: [
            'Ces Conditions peuvent être mises à jour lorsque MovieDNA évolue ou lorsque des exigences juridiques ou opérationnelles le nécessitent. La date affichée en haut de la page indique la dernière révision.',
          ],
        },
      ],
    },

    privacy: {
      title: 'Politique de confidentialité',
      updatedLabel: 'Dernière mise à jour',
      intro:
        'La présente Politique de confidentialité explique quelles informations MovieDNA utilise, pourquoi elles sont utilisées et quels choix vous sont proposés lorsque vous utilisez le service.',
      sections: [
        {
          title: '1. Informations utilisées par MovieDNA',
          paragraphs: [
            'Les informations de compte peuvent comprendre votre adresse e-mail, nom d’utilisateur, nom affiché, identifiants de compte, paramètres de profil et avatar choisi.',
            'Votre activité liée aux films et séries peut comprendre les notes, favoris, listes à regarder, historique de visionnage, réponses d’onboarding et d’affinement du DNA, collections et interactions avec les recommandations.',
            'Les fonctions sociales peuvent traiter les relations d’amitié, commentaires, informations publiques du profil, notifications et collections que vous choisissez de rendre publiques.',
            'Des informations techniques et de sécurité peuvent être traitées lorsque cela est nécessaire pour authentifier les utilisateurs, protéger MovieDNA, prévenir les abus, diagnostiquer les erreurs et faire fonctionner le service.',
          ],
        },
        {
          title: '2. Utilisation des informations',
          paragraphs: [
            'MovieDNA utilise les informations de compte pour fournir l’authentification et les fonctions liées au compte.',
            'Votre activité liée aux films et séries sert à créer et mettre à jour votre profil MovieDNA, produire des recommandations, maintenir votre bibliothèque et votre historique, ainsi qu’afficher des statistiques et des succès.',
            'Les informations sont également utilisées pour sécuriser le service, analyser les erreurs, prévenir les abus et maintenir le fonctionnement du produit.',
          ],
        },
        {
          title: '3. Prestataires et données du catalogue',
          paragraphs: [
            'MovieDNA utilise des services Firebase et Google Cloud notamment pour l’authentification, la base de données, les traitements backend, l’hébergement et la sécurité de l’application.',
            'MovieDNA utilise les données et images de TMDB pour fournir les informations relatives aux films, séries et personnes. Les requêtes au catalogue peuvent donc impliquer une infrastructure tierce.',
          ],
        },
        {
          title: '4. Informations publiques et privées',
          paragraphs: [
            'Les paramètres de votre compte déterminent si les informations de profil prises en charge sont publiques ou privées.',
            'Les profils publics, collections publiques et commentaires peuvent être visibles par d’autres utilisateurs. Les données privées du compte et de la bibliothèque ne sont pas destinées à être affichées publiquement.',
          ],
        },
        {
          title: '5. Conservation et suppression',
          paragraphs: [
            'MovieDNA conserve les informations tant qu’elles sont nécessaires au fonctionnement de votre compte et des fonctions que vous utilisez.',
            'Lorsque vous demandez la suppression du compte à l’aide des paramètres disponibles, MovieDNA tentera de supprimer les données MovieDNA liées à votre compte conformément au processus de suppression mis en œuvre par le service.',
            'Certaines informations peuvent devoir être conservées temporairement pour des raisons de sécurité, d’intégrité technique, de sauvegarde, de prévention de la fraude ou d’obligations légales applicables.',
          ],
        },
        {
          title: '6. Vos choix',
          paragraphs: [
            'Vous pouvez gérer les paramètres de confidentialité pris en charge, supprimer les titres et activités lorsque l’interface le permet et supprimer votre compte MovieDNA depuis les paramètres du compte.',
            'Selon la loi applicable, vous pouvez également disposer de droits concernant l’accès, la rectification, la suppression, la limitation ou la portabilité de vos données personnelles.',
          ],
        },
        {
          title: '7. Sécurité',
          paragraphs: [
            'MovieDNA utilise des mécanismes d’authentification, des règles de contrôle d’accès, des contrôles d’intégrité de l’application et des validations backend destinés à protéger les comptes et les données du service.',
            'Aucun service en ligne ne peut garantir une sécurité absolue. Vous devez également protéger votre mot de passe et vos appareils.',
          ],
        },
        {
          title: '8. Mineurs',
          paragraphs: [
            'MovieDNA n’a pas vocation à contourner les exigences d’âge ou de consentement parental applicables dans votre lieu de résidence. Les utilisateurs doivent être légalement autorisés à créer et utiliser un compte.',
          ],
        },
        {
          title: '9. Modification de cette Politique',
          paragraphs: [
            'Cette Politique peut être mise à jour lorsque les fonctionnalités, pratiques de traitement ou exigences applicables évoluent. La date affichée en haut de la page indique la dernière mise à jour.',
          ],
        },
      ],
    },
  },

  ru: {
    terms: {
      title: 'Условия использования',
      updatedLabel: 'Последнее обновление',
      intro:
        'Настоящие Условия использования регулируют доступ к MovieDNA и использование сервиса. Создавая аккаунт или используя MovieDNA, вы соглашаетесь с этими Условиями.',
      sections: [
        {
          title: '1. Сервис MovieDNA',
          paragraphs: [
            'MovieDNA — платформа для поиска фильмов и сериалов, которая позволяет создавать профиль предпочтений, получать персональные рекомендации, ставить оценки и сохранять фильмы и сериалы, вести историю просмотров, создавать подборки и использовать социальные функции.',
            'MovieDNA может со временем изменять, добавлять, удалять или улучшать отдельные функции.',
          ],
        },
        {
          title: '2. Ваш аккаунт',
          paragraphs: [
            'Вы отвечаете за корректность данных, указанных при регистрации, а также за безопасность доступа к своему аккаунту.',
            'Запрещено выдавать себя за другого человека, создавать аккаунты для злоупотреблений или пытаться получить доступ к аккаунту другого пользователя.',
          ],
        },
        {
          title: '3. Допустимое использование',
          paragraphs: [
            'Нельзя использовать MovieDNA для нарушения применимого законодательства, нарушения работы сервиса, травли других пользователей, распространения вредоносного контента или обхода механизмов безопасности и контроля доступа.',
            'Автоматизированный сбор данных, несанкционированная обратная разработка и попытки перегрузить или нарушить работу MovieDNA запрещены, кроме случаев, когда применимое законодательство прямо разрешает такие действия.',
          ],
        },
        {
          title: '4. Пользовательский контент и социальные функции',
          paragraphs: [
            'MovieDNA может позволять публиковать или распространять контент, включая комментарии, информацию профиля и публичные подборки. Вы несёте ответственность за опубликованный вами контент.',
            'Контент, который вы делаете публичным, может быть виден другим пользователям MovieDNA. Не публикуйте информацию, которую вы не хотите раскрывать другим.',
            'MovieDNA может ограничить или удалить контент либо аккаунт, если это обоснованно необходимо для защиты пользователей, соблюдения этих Условий или требований применимого законодательства.',
          ],
        },
        {
          title: '5. Рекомендации и данные каталога',
          paragraphs: [
            'Рекомендации MovieDNA формируются на основе доступных данных о предпочтениях и активности. Они являются предложениями и не гарантируют, что конкретный фильм или сериал вам понравится.',
            'Часть информации о фильмах, сериалах, людях и изображениях поступает от сторонних поставщиков данных. MovieDNA не может гарантировать, что сторонняя информация всегда будет полной, актуальной и безошибочной.',
          ],
        },
        {
          title: '6. Доступность сервиса',
          paragraphs: [
            'Мы стремимся поддерживать MovieDNA доступным и стабильным, однако не можем гарантировать полностью бесперебойную и безошибочную работу.',
            'Отдельные функции могут временно быть недоступны из-за технических работ, сбоев, мер безопасности, работы сторонних сервисов или изменений продукта.',
          ],
        },
        {
          title: '7. Ограничение и удаление аккаунта',
          paragraphs: [
            'Вы можете прекратить использование MovieDNA в любое время и воспользоваться доступной функцией удаления аккаунта.',
            'MovieDNA может ограничить или прекратить доступ в случае серьёзных злоупотреблений, угроз безопасности, повторных нарушений настоящих Условий или требований законодательства.',
          ],
        },
        {
          title: '8. Ограничения и ответственность',
          paragraphs: [
            'MovieDNA предоставляется по мере доступности. В пределах, допускаемых применимым законодательством, MovieDNA не гарантирует постоянную точность или доступность каждой функции, рекомендации или элемента стороннего каталога.',
            'Настоящие Условия не ограничивают права и гарантии, которые не могут быть исключены по закону.',
          ],
        },
        {
          title: '9. Изменение Условий',
          paragraphs: [
            'Условия могут обновляться при изменении MovieDNA либо юридических и операционных требований. Дата в верхней части страницы показывает последнюю редакцию.',
          ],
        },
      ],
    },

    privacy: {
      title: 'Политика конфиденциальности',
      updatedLabel: 'Последнее обновление',
      intro:
        'Настоящая Политика конфиденциальности объясняет, какие данные использует MovieDNA, зачем они используются и какие возможности управления ими доступны пользователю.',
      sections: [
        {
          title: '1. Какие данные использует MovieDNA',
          paragraphs: [
            'Данные аккаунта могут включать адрес электронной почты, имя пользователя, отображаемое имя, идентификаторы аккаунта, настройки профиля и выбранный аватар.',
            'Активность, связанная с фильмами и сериалами, может включать оценки, избранное, список к просмотру, историю просмотров, ответы онбординга и уточнения DNA, подборки и взаимодействия с рекомендациями.',
            'Социальные функции могут обрабатывать данные о дружбе, комментарии, публичную информацию профиля, уведомления и подборки, которые пользователь делает публичными.',
            'Технические данные и данные безопасности могут обрабатываться в объёме, необходимом для авторизации пользователей, защиты MovieDNA, предотвращения злоупотреблений, диагностики ошибок и работы сервиса.',
          ],
        },
        {
          title: '2. Для чего используются данные',
          paragraphs: [
            'Данные аккаунта используются для авторизации и предоставления функций аккаунта.',
            'Активность, связанная с фильмами и сериалами, используется для создания и обновления MovieDNA, формирования рекомендаций, работы библиотеки и истории, а также отображения статистики и достижений.',
            'Данные также используются для обеспечения безопасности сервиса, диагностики ошибок, предотвращения злоупотреблений и поддержания работы продукта.',
          ],
        },
        {
          title: '3. Поставщики инфраструктуры и данные каталога',
          paragraphs: [
            'MovieDNA использует сервисы Firebase и Google Cloud, в частности для авторизации, хранения данных, backend-обработки, хостинга и защиты приложения.',
            'MovieDNA использует данные и изображения TMDB для отображения информации о фильмах, сериалах и людях. Поэтому запросы к каталогу могут включать стороннюю инфраструктуру.',
          ],
        },
        {
          title: '4. Публичные и приватные данные',
          paragraphs: [
            'Настройки аккаунта определяют, является ли поддерживаемая информация профиля публичной или приватной.',
            'Публичные профили, публичные подборки и комментарии могут быть видны другим пользователям. Приватные данные аккаунта и приватная информация библиотеки не предназначены для публичного отображения.',
          ],
        },
        {
          title: '5. Хранение и удаление данных',
          paragraphs: [
            'MovieDNA хранит информацию, пока она необходима для работы аккаунта и используемых функций.',
            'При запросе удаления аккаунта через доступные настройки MovieDNA попытается удалить связанные с аккаунтом данные MovieDNA в соответствии с реализованным процессом удаления.',
            'Некоторые данные могут временно сохраняться, если это необходимо для безопасности, технической целостности, резервного копирования, предотвращения мошенничества или выполнения применимых юридических обязанностей.',
          ],
        },
        {
          title: '6. Ваши возможности',
          paragraphs: [
            'Вы можете управлять доступными настройками приватности профиля, удалять сохранённые фильмы, сериалы и активность там, где это предусмотрено интерфейсом, а также удалить аккаунт через настройки.',
            'В зависимости от применимого законодательства у вас также могут быть права на доступ, исправление, удаление, ограничение обработки или перенос персональных данных.',
          ],
        },
        {
          title: '7. Безопасность',
          paragraphs: [
            'MovieDNA использует авторизацию, правила контроля доступа, проверки целостности приложения и backend-валидацию, предназначенные для защиты аккаунтов и данных сервиса.',
            'Ни один онлайн-сервис не может гарантировать абсолютную безопасность, поэтому также важно защищать свой пароль и устройства.',
          ],
        },
        {
          title: '8. Несовершеннолетние',
          paragraphs: [
            'MovieDNA не предназначен для обхода требований к возрасту или согласию родителей, действующих по месту проживания пользователя. Пользователь должен иметь законное право создать и использовать аккаунт.',
          ],
        },
        {
          title: '9. Изменение Политики',
          paragraphs: [
            'Политика может обновляться при изменении функций MovieDNA, практик обработки данных или применимых требований. Дата в верхней части страницы показывает последнюю редакцию.',
          ],
        },
      ],
    },
  },
})

export function getLegalDocument(
  type,
  locale = 'en',
) {
  const selectedLocale =
    ['en', 'fr', 'ru'].includes(locale)
      ? locale
      : 'en'

  const document =
    documents[selectedLocale]?.[type]

  if (!document) {
    throw new TypeError(
      'Unknown legal document.',
    )
  }

  return {
    ...document,
    updated: UPDATED[selectedLocale],
  }
}
