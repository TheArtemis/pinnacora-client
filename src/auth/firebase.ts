import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

function requireFirebaseEnv(name: string) {
  const value = import.meta.env[name]

  if (!value || value.startsWith('your-')) {
    throw new Error(`Missing Firebase config: set ${name} in pinnacora-client/.env`)
  }

  return value
}

const firebaseConfig = {
  apiKey: requireFirebaseEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireFirebaseEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireFirebaseEnv('VITE_FIREBASE_PROJECT_ID'),
  appId: requireFirebaseEnv('VITE_FIREBASE_APP_ID'),
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
