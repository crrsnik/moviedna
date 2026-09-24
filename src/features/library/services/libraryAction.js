// Synchronous lock complements the service lock and is testable without React.
export function createLibraryAction() {
  let busy = false, generation = 0, active = true
  return {
    activate() { active = true; generation++ },
    dispose() { active = false; generation++ },
    async run(operation, notify) {
      if (!active || busy) return
      const ownGeneration = generation
      const current = () => active && generation === ownGeneration
      busy = true; notify({ pending: true, error: null })
      try { await operation() }
      catch (error) { if (current()) notify({ pending: true, error }) }
      finally { busy = false; if (current()) notify({ pending: false }) }
    },
  }
}
