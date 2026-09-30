import { createContext, useContext, useMemo, useState } from 'react'

export const HintContext = createContext()

export function HintProvider({ children }) {
  const [hint, setHintRaw] = useState(null)
  const api = useMemo(() => {
    return {
      hint,
      // Rows call setHint(text, e.currentTarget) from onPointerEnter so the
      // tooltip can dock beside the row the pointer is on; null clears it.
      setHint: (text, anchor) => setHintRaw(text ? { text, anchor: anchor || null } : null),
    }
  }, [hint])
  return <HintContext.Provider value={api}>{children}</HintContext.Provider>
}
