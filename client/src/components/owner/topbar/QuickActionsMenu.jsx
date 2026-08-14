import React from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../../../context/AppContext'
import { useI18n } from '../../../i18n/I18nContext'
import TopbarPopover from './TopbarPopover'
import { CalendarIcon, CarIcon, FileIcon, PlusIcon, UserIcon } from './icons'

const ACTIONS = [
  { key: 'walkIn', to: '/owner/walk-in', permission: 'bookings', Icon: PlusIcon },
  { key: 'addCar', to: '/owner/add-car', permission: 'fleet', Icon: CarIcon },
  { key: 'calendar', to: '/owner/calendar', permission: 'calendar', Icon: CalendarIcon },
  { key: 'customers', to: '/owner/customers', permission: 'customers', Icon: UserIcon },
  { key: 'invoices', to: '/owner/invoices', permission: 'contracts', Icon: FileIcon },
]

/** Create-oriented shortcuts, filtered by the admin's permissions. */
const QuickActionsMenu = () => {
  const { hasPermission } = useAppContext()
  const { t } = useI18n()

  const actions = ACTIONS.filter((action) => hasPermission(action.permission))
  if (!actions.length) return null

  return (
    <TopbarPopover
      ariaLabel={t('admin.shell.quickActions')}
      title={t('admin.shell.quickActions')}
      width="15rem"
      renderTrigger={() => <PlusIcon size={18} />}
    >
      {({ close }) => (
        <div className="admin-pop-scroll">
          <p className="admin-pop-section">{t('admin.shell.quickActions')}</p>
          {actions.map(({ key, to, Icon }) => (
            <Link key={key} to={to} data-pop-item className="admin-pop-item" onClick={() => close({ restoreFocus: false })}>
              <Icon />
              <span className="admin-pop-item-label">{t(`admin.shell.quick.${key}`)}</span>
            </Link>
          ))}
        </div>
      )}
    </TopbarPopover>
  )
}

export default QuickActionsMenu
