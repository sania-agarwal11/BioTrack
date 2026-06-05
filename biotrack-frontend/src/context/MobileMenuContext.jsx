import { createContext, useContext, useState, useCallback } from 'react'

const MobileMenuContext = createContext({
  isOpen: false,
  toggle: () => {},
  close:  () => {},
})

export function MobileMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen(o => !o), [])
  const close  = useCallback(() => setIsOpen(false), [])
  return (
    <MobileMenuContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export const useMobileMenu = () => useContext(MobileMenuContext)
