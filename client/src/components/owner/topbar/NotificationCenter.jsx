import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import { getErrorMessage } from '../../../utils/apiError'
import TopbarPopover from './TopbarPopover'
import { BellIcon } from './icons'

const LOCALE = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' }

const timeAgo = (value, language) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(LOCALE[language] || 'en-GB', { numeric: 'auto' })
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return rtf.format(-Math.round(seconds / secondsPerUnit), unit)
    }
  }
  return rtf.format(-seconds, 'second')
}

const NotificationCenter = () => {
  const { axios } = useAppContext()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/owner/notifications')
      if (data.success) {
        setItems(data.notifications || [])
        setUnread(data.unreadCount || 0)
      }
    } catch {
      /* keep the last known list on transient failures */
    }
  }, [axios])

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [load])

  const markAll = async () => {
    try {
      await axios.post('/api/owner/notifications/read', { all: true })
      load()
    } catch (error) {
      console.error(getErrorMessage(error))
    }
  }

  const openItem = async (notification, close) => {
    close({ restoreFocus: false })
    navigate(notification.link || '/owner/manage-bookings')
    if (notification.isRead) return
    try {
      await axios.post('/api/owner/notifications/read', { notificationId: notification._id })
      load()
    } catch (error) {
      console.error(getErrorMessage(error))
    }
  }

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.notifications')}
      title={t('admin.shell.notifications')}
      width="21rem"
      badge={unread}
      onOpen={load}
      renderTrigger={() => <BellIcon />}
    >
      {({ close }) => (
        <>
          <div className="admin-pop-head">
            <p className="admin-pop-title">
              {t('admin.shell.notifications')}
              {unread > 0 ? (
                <span className="admin-pop-item-hint"> · {t('admin.shell.unreadCount', { count: unread })}</span>
              ) : null}
            </p>
            {unread > 0 ? (
              <button
                type="button"
                data-pop-item
                onClick={markAll}
                className="admin-pop-action"
              >
                {t('admin.shell.markAllRead')}
              </button>
            ) : null}
          </div>

          <div className="admin-pop-scroll">
            {items.length === 0 ? (
              <p className="admin-pop-empty">{t('admin.shell.noNotifications')}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  data-pop-item
                  className="admin-note"
                  onClick={() => openItem(item, close)}
                >
                  <span className="admin-note-title">
                    {!item.isRead ? <span className="admin-note-dot" aria-hidden /> : null}
                    {item.title}
                  </span>
                  <span className="admin-note-body">{item.message}</span>
                  <span className="admin-note-time">{timeAgo(item.createdAt, language)}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </TopbarPopover>
  )
}

export default NotificationCenter
