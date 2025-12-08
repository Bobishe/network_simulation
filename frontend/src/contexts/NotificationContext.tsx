import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error'
}

interface NotificationContextValue {
  notification: Notification | null
  showNotification: (message: string, type: 'success' | 'error') => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    const id = Math.random().toString(36).substring(7)
    setNotification({ id, message, type })

    // Автоматически скрыть уведомление через 3 секунды
    setTimeout(() => {
      setNotification(null)
    }, 3000)
  }, [])

  return (
    <NotificationContext.Provider value={{ notification, showNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}
