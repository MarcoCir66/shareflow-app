import { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { LogIn, LogOut } from 'lucide-react'
import { loginRequest } from '../../auth/msalConfig.js'
import { useConfigurator } from '../../hooks/useConfigurator.js'

export default function AuthSection() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const { dispatch, ACTIONS } = useConfigurator()
  const account = accounts[0]

  useEffect(() => {
    if (isAuthenticated && account) {
      dispatch({ type: ACTIONS.SET_TENANT_META, payload: { tenantId: account.tenantId } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, account?.tenantId])

  if (isAuthenticated && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-400 bg-ink-800 px-3 py-1 rounded-full border border-ink-700">
          {account.username}
        </span>
        <button
          onClick={() => instance.logoutPopup()}
          className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-white transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => instance.loginPopup(loginRequest)}
      className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-white bg-ink-800 px-3 py-1 rounded-full border border-ink-700 transition-colors"
    >
      <LogIn size={14} /> Sign in with Microsoft
    </button>
  )
}
