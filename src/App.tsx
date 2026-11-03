import { useState } from "react"
import { Dashboard } from "@/dashboard"
import { Gate } from "@/gate"
import { TOKEN_KEY } from "@/lib/api"

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))

  if (!token) return <Gate onReady={setToken} />

  return (
    <Dashboard
      token={token}
      onSignOut={() => {
        sessionStorage.removeItem(TOKEN_KEY)
        setToken(null)
      }}
    />
  )
}
