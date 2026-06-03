import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from './firebase'
import { AuthContext, type AuthContextValue } from './authState'

const apiUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL

async function syncBackendUser(user: User, displayName?: string) {
  const token = await user.getIdToken()

  const response = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: displayName ?? user.displayName,
      photoUrl: user.photoURL,
    }),
  })

  if (!response.ok) {
    throw new Error('Could not create your game profile. Please try again.')
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const credentials = await signInWithEmailAndPassword(auth, email, password)
        await syncBackendUser(credentials.user)
      },
      async register(displayName, email, password) {
        const credentials = await createUserWithEmailAndPassword(auth, email, password)

        if (displayName) {
          await updateProfile(credentials.user, { displayName })
        }

        await syncBackendUser(credentials.user, displayName)
      },
      logout() {
        return signOut(auth)
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
