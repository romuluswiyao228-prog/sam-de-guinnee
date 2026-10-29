/**
 * Unit tests for route guard logic.
 *
 * We test the pure guard behaviour by mocking useAuth and verifying
 * that the correct component (children vs redirect) is rendered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// ---------- mock useAuth ----------
const mockAuth = {
  user: null as { id: string } | null,
  loading: false,
  roles: [] as string[],
  hasAnyRole: (roles: string[]): boolean => roles.length < 0,
  needsMfa: false,
  getDefaultRedirect: () => '/mon-compte',
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

// Import AFTER the mock is defined
import { RequireAuth, RequireRole } from '@/components/auth/RouteGuards'

function renderGuarded(element: React.ReactNode, path = '/protected') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/connexion" element={<div data-testid="login">login-page</div>} />
        <Route path="/securite" element={<div data-testid="security">security-page</div>} />
        <Route path="/mon-compte" element={<div data-testid="account">account-page</div>} />
        <Route path="/protected" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    mockAuth.user = null
    mockAuth.loading = false
    mockAuth.roles = []
    mockAuth.needsMfa = false
    mockAuth.hasAnyRole = (roles: string[]) => roles.length < 0
  })

  it('redirects unauthenticated users to /connexion', () => {
    mockAuth.user = null

    renderGuarded(
      <RequireAuth><div data-testid="secret">secret content</div></RequireAuth>,
    )

    expect(screen.getByTestId('login')).toBeInTheDocument()
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    mockAuth.user = { id: 'u1' }

    renderGuarded(
      <RequireAuth><div data-testid="secret">secret content</div></RequireAuth>,
    )

    expect(screen.getByTestId('secret')).toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  beforeEach(() => {
    mockAuth.user = null
    mockAuth.loading = false
    mockAuth.roles = []
    mockAuth.needsMfa = false
    mockAuth.hasAnyRole = (r: string[]) => r.some((role) => mockAuth.roles.includes(role))
  })

  it('redirects unauthenticated users to /connexion', () => {
    mockAuth.user = null

    renderGuarded(
      <RequireRole roles={['admin']}><div data-testid="admin-area">admin</div></RequireRole>,
    )

    expect(screen.getByTestId('login')).toBeInTheDocument()
  })

  it('redirects authenticated users without required role to /mon-compte', () => {
    mockAuth.user = { id: 'u1' }
    mockAuth.roles = ['user']

    renderGuarded(
      <RequireRole roles={['admin']}><div data-testid="admin-area">admin</div></RequireRole>,
    )

    expect(screen.getByTestId('account')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-area')).not.toBeInTheDocument()
  })

  it('redirects staff without MFA (needsMfa=true) to /securite', () => {
    mockAuth.user = { id: 'u2' }
    mockAuth.roles = ['staff']
    mockAuth.needsMfa = true

    renderGuarded(
      <RequireRole roles={['admin', 'staff']}><div data-testid="staff-area">staff</div></RequireRole>,
    )

    expect(screen.getByTestId('security')).toBeInTheDocument()
    expect(screen.queryByTestId('staff-area')).not.toBeInTheDocument()
  })

  it('renders children for admin with MFA verified (needsMfa=false)', () => {
    mockAuth.user = { id: 'u3' }
    mockAuth.roles = ['admin']
    mockAuth.needsMfa = false

    renderGuarded(
      <RequireRole roles={['admin']}><div data-testid="admin-area">admin</div></RequireRole>,
    )

    expect(screen.getByTestId('admin-area')).toBeInTheDocument()
  })

  it('renders children for staff with MFA verified', () => {
    mockAuth.user = { id: 'u4' }
    mockAuth.roles = ['staff']
    mockAuth.needsMfa = false

    renderGuarded(
      <RequireRole roles={['admin', 'staff']}><div data-testid="staff-area">staff</div></RequireRole>,
    )

    expect(screen.getByTestId('staff-area')).toBeInTheDocument()
  })
})

