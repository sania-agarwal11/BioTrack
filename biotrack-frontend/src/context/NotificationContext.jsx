import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getNotificationsByUser } from '../api/notifications'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({ unreadCount: 0, refresh: () => {} })

export function NotificationProvider({ children }) {
  const { user, hasRole } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    if (!user) { setUnreadCount(0); return }
    // All roles (including ADMIN) use their own per-user feed for the badge count
    // so admin's unread count only reflects notifications meant for them personally
    const fetchFn = getNotificationsByUser(user.userId)
    fetchFn
      .then(r => {
        // Only count notifications RECEIVED by this user (not sent by them)
        const count = (r.data || []).filter(n =>
          n.status === 'UNREAD' &&
          (n.senderUserId == null || Number(n.senderUserId) !== Number(user.userId))
        ).length
        setUnreadCount(count)
      })
      .catch(() => {})
  }, [user, hasRole]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll every 30 seconds while user is logged in
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
