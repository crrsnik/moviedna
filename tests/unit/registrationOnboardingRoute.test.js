import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  describe,
  it,
} from 'node:test'

const read = async path => readFile(
  new URL(
    `../../${path}`,
    import.meta.url,
  ),
  'utf8',
)

describe('Registration and deferred onboarding routing', () => {
  it('keeps fresh registration distinct until onboarding mounts', async () => {
    const register = await read(
      'src/features/auth/components/RegisterForm.jsx',
    )

    const success = register.indexOf(
      "setRegistrationStatus('succeeded')",
    )

    const navigation = register.indexOf(
      "navigate('/onboarding'",
    )

    assert.ok(success >= 0)
    assert.ok(navigation > success)

    assert.doesNotMatch(
      register,
      /status === 'succeeded'[\s\S]{0,80}\?\s*'idle'/,
    )
  })

  it('routes fresh registration to onboarding but normal auth home', async () => {
    const route = await read(
      'src/features/auth/components/GuestOnlyRoute.jsx',
    )

    assert.match(
      route,
      /registrationStatus === 'succeeded'/,
    )
    assert.match(
      route,
      /Navigate to="\/onboarding"/,
    )

    assert.match(
      route,
      /registrationStatus === 'idle'/,
    )
    assert.match(
      route,
      /Navigate to="\/"/,
    )
  })

  it('acknowledges successful registration only after onboarding mounted', async () => {
    const page = await read(
      'src/pages/OnboardingPage.jsx',
    )

    assert.match(
      page,
      /registrationStatus === 'succeeded'/,
    )

    assert.match(
      page,
      /setRegistrationStatus\('idle'\)/,
    )
  })

  it('does not force deferred onboarding again after ordinary login', async () => {
    const login = await read(
      'src/features/auth/components/LoginForm.jsx',
    )

    assert.match(
      login,
      /navigate\('\/',\s*\{\s*replace:\s*true\s*\}\)/,
    )

    assert.doesNotMatch(
      login,
      /navigate\('\/onboarding'/,
    )
  })
})
