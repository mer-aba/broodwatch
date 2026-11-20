'use client'

import { createContext, useContext } from 'react'

const AuthUserContext = createContext({ displayName: 'Farmer', initials: 'F' })

export function AuthUserProvider({ displayName = 'Farmer', isAdmin = false, children }) {
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'F'
  return (
    <AuthUserContext.Provider value={{ displayName, initials, isAdmin }}>
      {children}
    </AuthUserContext.Provider>
  )
}

export function useAuthUser() {
  return useContext(AuthUserContext)
}
