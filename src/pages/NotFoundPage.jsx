import PagePlaceholder from '../shared/components/PagePlaceholder.jsx'
import { useTranslation } from '../features/localization/hooks/useTranslation.js'

function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <PagePlaceholder
      title={t('notFound.title')}
      subtitle={t('notFound.subtitle')}
    />
  )
}

export default NotFoundPage
