import {
  TASTE_TITLE_COMBINATIONS,
  TASTE_TITLE_IDS,
} from './selectTasteTitle.js'

export const TASTE_SIGNAL_LABEL_IDS = Object.freeze({
  'taste:psychological-thriller': 'psychologicalThriller',
  'taste:crime-thriller': 'crimeThriller',
  'taste:emotional-drama': 'emotionalDrama',
  'taste:philosophical-sci-fi': 'philosophicalSciFi',
  'taste:dystopian-sci-fi': 'dystopianSciFi',
  'taste:space-sci-fi': 'spaceSciFi',
  'taste:coming-of-age': 'comingOfAge',
  'taste:dark-comedy': 'darkComedy',
  'taste:slasher': 'slasher',
  'taste:supernatural-horror': 'supernaturalHorror',
  'taste:russian-romantic-tv': 'russianRomanticTv',
  'taste:romantic-drama': 'romanticDrama',
  'taste:romantic-comedy': 'romanticComedy',
  'taste:mystery-detective': 'mysteryDetective',
  'taste:action-spectacle': 'actionSpectacle',
  'taste:fantasy-adventure': 'fantasyAdventure',
  'taste:dark-fantasy': 'darkFantasy',
  'taste:historical-period': 'historicalPeriod',
  'taste:war-drama': 'warDrama',
  'taste:anime': 'anime',
  'taste:adult-animation': 'adultAnimation',
})

const SINGLE_SIGNAL_BY_TITLE = Object.freeze(
  Object.fromEntries(
    Object.entries(TASTE_TITLE_IDS).map(
      ([signal, titleId]) => [
        titleId,
        Object.freeze([signal]),
      ],
    ),
  ),
)

const COMBINATION_SIGNALS_BY_TITLE = Object.freeze(
  Object.fromEntries(
    Object.entries(TASTE_TITLE_COMBINATIONS).map(
      ([signals, titleId]) => [
        titleId,
        Object.freeze(signals.split('|')),
      ],
    ),
  ),
)

export function getTasteTitleSignals(titleId) {
  if (
    typeof titleId !== 'string'
    || !titleId
  ) {
    return []
  }

  const signals = (
    COMBINATION_SIGNALS_BY_TITLE[titleId]
    ?? SINGLE_SIGNAL_BY_TITLE[titleId]
    ?? []
  )

  return [...signals]
}
