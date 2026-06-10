export function getApiUrl() {
  return import.meta.env.VITE_API_URL ?? import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'
}
