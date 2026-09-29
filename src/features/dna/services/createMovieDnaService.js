import { normalizeMovieDnaCurrent, normalizeMovieDnaRecalculation } from './normalizeMovieDna.js'

export function createMovieDnaService({ database, document, subscribe }) {
  return {
    subscribe(uid, next) {
      if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new Error('A valid owner is required.')
      let active = true
      const state = { current: undefined, recalculation: undefined, errors: {} }
      const publish = () => {
        if (!active || state.current === undefined || state.recalculation === undefined) return
        next({ current: state.current, recalculation: state.recalculation, error: state.errors.current ?? state.errors.recalculation ?? null })
      }
      const listen = (name, path, normalize) => subscribe(document(database, ...path), { includeMetadataChanges: true }, (snapshot) => {
        if (!active || snapshot.metadata?.hasPendingWrites) return
        try { state[name] = normalize(snapshot); delete state.errors[name] } catch (error) { state[name] = null; state.errors[name] = error }
        publish()
      }, () => { if (active) { state[name] = null; state.errors[name] = new Error('unavailable'); publish() } })
      const stopCurrent = listen('current', ['users', uid, 'movieDna', 'current'], normalizeMovieDnaCurrent)
      const stopRecalculation = listen('recalculation', ['users', uid, 'movieDna', 'recalculation'], normalizeMovieDnaRecalculation)
      return () => { active = false; stopCurrent(); stopRecalculation() }
    },
  }
}
