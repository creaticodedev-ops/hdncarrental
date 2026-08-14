import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AdminPage, FormField, PageHeader, SegmentedControl, StatusBadge } from '../../admin/ui'
import { useAdminTheme } from '../../admin/AdminThemeContext'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import { getErrorMessage } from '../../utils/apiError'
import { initialsOf } from '../../components/owner/topbar/AccountMenu'
import { ShieldIcon, SettingsIcon, UserIcon } from '../../components/owner/topbar/icons'

const TABS = [
  { id: 'profile', labelKey: 'admin.account.profile', Icon: UserIcon },
  { id: 'security', labelKey: 'admin.account.security', Icon: ShieldIcon },
  { id: 'preferences', labelKey: 'admin.account.preferences', Icon: SettingsIcon },
]

const MIN_PASSWORD_LENGTH = 8

const passwordScore = (value) => {
  let score = 0
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1
  if (value.length >= 12) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 4)
}

const Account = () => {
  const { user, axios, fetchUser, setToken, license } = useAppContext()
  const { t, language, setLanguage, languages } = useI18n()
  const { preference, setPreference } = useAdminTheme()
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedTab = searchParams.get('tab')
  const activeTab = TABS.some((tab) => tab.id === requestedTab) ? requestedTab : 'profile'

  const [name, setName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : ''),
    [avatarFile],
  )
  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const selectTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'profile') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const dateLabel = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error(t('admin.account.nameTooShort'))
      return
    }
    setSavingProfile(true)
    try {
      const { data } = await axios.put('/api/owner/account/profile', { name: trimmed })
      if (!data.success) {
        toast.error(data.message)
        return
      }
      await fetchUser()
      toast.success(t('admin.account.profileSaved'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSavingProfile(false)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('image', avatarFile)
      const { data } = await axios.post('/api/owner/update-image', formData)
      if (!data.success) {
        toast.error(data.message)
        return
      }
      setAvatarFile(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      await fetchUser()
      toast.success(t('admin.account.photoSaved'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    if (passwords.next.length < MIN_PASSWORD_LENGTH) {
      toast.error(t('admin.account.passwordTooShort', { count: MIN_PASSWORD_LENGTH }))
      return
    }
    if (passwords.next !== passwords.confirm) {
      toast.error(t('admin.account.passwordMismatch'))
      return
    }
    setChangingPassword(true)
    try {
      const { data } = await axios.put('/api/owner/account/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      })
      if (!data.success) {
        toast.error(data.message)
        return
      }
      // The server rotated the token version; adopt the fresh token so this tab stays signed in.
      if (data.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      }
      setPasswords({ current: '', next: '', confirm: '' })
      toast.success(t('admin.account.passwordChanged'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setChangingPassword(false)
    }
  }

  const signOutOthers = async () => {
    setRevoking(true)
    try {
      const { data } = await axios.post('/api/owner/account/sign-out-others')
      if (!data.success) {
        toast.error(data.message)
        return
      }
      if (data.token) {
        localStorage.setItem('token', data.token)
        setToken(data.token)
      }
      toast.success(t('admin.account.sessionsRevoked'))
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setRevoking(false)
    }
  }

  const score = passwordScore(passwords.next)
  const strengthLabels = [
    t('admin.account.strengthWeak'),
    t('admin.account.strengthWeak'),
    t('admin.account.strengthFair'),
    t('admin.account.strengthGood'),
    t('admin.account.strengthStrong'),
  ]

  const inputClass = 'admin-input'

  return (
    <AdminPage>
      <PageHeader title={t('admin.account.title')} description={t('admin.account.subtitle')} />

      <div className="admin-account-grid">
        <nav className="admin-account-nav" aria-label={t('admin.account.title')}>
          {TABS.map(({ id, labelKey, Icon }) => (
            <button
              key={id}
              type="button"
              className={`admin-account-tab${activeTab === id ? ' is-active' : ''}`}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => selectTab(id)}
            >
              <Icon size={16} />
              {t(labelKey)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {activeTab === 'profile' ? (
            <>
              <section className="admin-section-card">
                <div className="admin-section-head">
                  <h2 className="admin-section-title">{t('admin.account.photo')}</h2>
                  <p className="admin-section-desc">{t('admin.account.photoHint')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {avatarPreview || user?.image ? (
                    <img src={avatarPreview || user.image} alt="" className="admin-user-avatar is-xl" />
                  ) : (
                    <span className="admin-user-avatar is-xl" aria-hidden>
                      {initialsOf(user?.name)}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="admin-btn admin-btn-secondary admin-btn-sm cursor-pointer">
                      {t('admin.account.choosePhoto')}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    {avatarFile ? (
                      <>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary admin-btn-sm"
                          onClick={uploadAvatar}
                          disabled={uploadingAvatar}
                        >
                          {uploadingAvatar ? t('admin.common.saving') : t('admin.account.savePhoto')}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          onClick={() => {
                            setAvatarFile(null)
                            if (avatarInputRef.current) avatarInputRef.current.value = ''
                          }}
                        >
                          {t('admin.common.cancel')}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </section>

              <form className="admin-section-card" onSubmit={saveProfile}>
                <div className="admin-section-head">
                  <h2 className="admin-section-title">{t('admin.account.personalInfo')}</h2>
                  <p className="admin-section-desc">{t('admin.account.personalInfoHint')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('admin.account.name')} required>
                    <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
                  </FormField>
                  <FormField label={t('admin.account.email')} hint={t('admin.account.emailLocked')}>
                    <input className={inputClass} value={user?.email || ''} readOnly disabled />
                  </FormField>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" disabled={savingProfile}>
                    {savingProfile ? t('admin.common.saving') : t('admin.common.save')}
                  </button>
                </div>
              </form>

              <section className="admin-section-card">
                <div className="admin-section-head">
                  <h2 className="admin-section-title">{t('admin.account.accountDetails')}</h2>
                </div>
                <dl>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.agency')}</dt>
                    <dd>{user?.agencyName || '—'}</dd>
                  </div>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.role')}</dt>
                    <dd>{t('admin.shell.roleOwner')}</dd>
                  </div>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.plan')}</dt>
                    <dd>
                      <StatusBadge tone={license?.licenseStatus === 'active' ? 'success' : 'warn'}>
                        {license?.licenseStatus === 'active'
                          ? t('admin.account.planActive')
                          : t('admin.account.planTrial')}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.memberSince')}</dt>
                    <dd>{dateLabel(user?.createdAt)}</dd>
                  </div>
                </dl>
              </section>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <>
              <form className="admin-section-card" onSubmit={changePassword}>
                <div className="admin-section-head">
                  <h2 className="admin-section-title">{t('admin.account.changePassword')}</h2>
                  <p className="admin-section-desc">{t('admin.account.changePasswordHint')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t('admin.account.currentPassword')} required className="sm:col-span-2">
                    <input
                      type="password"
                      className={inputClass}
                      value={passwords.current}
                      onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                      autoComplete="current-password"
                      required
                    />
                  </FormField>
                  <FormField
                    label={t('admin.account.newPassword')}
                    hint={t('admin.account.passwordRule', { count: MIN_PASSWORD_LENGTH })}
                    required
                  >
                    <input
                      type="password"
                      className={inputClass}
                      value={passwords.next}
                      onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                  </FormField>
                  <FormField
                    label={t('admin.account.confirmPassword')}
                    error={
                      passwords.confirm && passwords.confirm !== passwords.next
                        ? t('admin.account.passwordMismatch')
                        : undefined
                    }
                    required
                  >
                    <input
                      type="password"
                      className={inputClass}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                      autoComplete="new-password"
                      required
                    />
                  </FormField>
                </div>

                {passwords.next ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-full"
                          style={{
                            background:
                              i < score
                                ? score <= 1
                                  ? 'var(--admin-danger)'
                                  : score === 2
                                    ? 'var(--admin-warn)'
                                    : 'var(--admin-success)'
                                : 'var(--admin-border)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-[var(--admin-muted)]">{strengthLabels[score]}</span>
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    disabled={changingPassword}
                  >
                    {changingPassword ? t('admin.common.saving') : t('admin.account.updatePassword')}
                  </button>
                </div>
              </form>

              <section className="admin-section-card">
                <div className="admin-section-head">
                  <h2 className="admin-section-title">{t('admin.account.sessions')}</h2>
                  <p className="admin-section-desc">{t('admin.account.sessionsHint')}</p>
                </div>
                <dl>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.thisDevice')}</dt>
                    <dd>
                      <StatusBadge tone="success">{t('admin.account.active')}</StatusBadge>
                    </dd>
                  </div>
                  <div className="admin-kv-row">
                    <dt>{t('admin.account.lastSignIn')}</dt>
                    <dd>{dateLabel(user?.lastLoginAt)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={signOutOthers}
                    disabled={revoking}
                  >
                    {revoking ? t('admin.common.saving') : t('admin.account.signOutOthers')}
                  </button>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === 'preferences' ? (
            <section className="admin-section-card">
              <div className="admin-section-head">
                <h2 className="admin-section-title">{t('admin.account.preferences')}</h2>
                <p className="admin-section-desc">{t('admin.account.preferencesHint')}</p>
              </div>
              <div className="space-y-5">
                <div>
                  <p className="admin-label">{t('admin.shell.themeLabel')}</p>
                  <SegmentedControl
                    ariaLabel={t('admin.shell.themeLabel')}
                    value={preference}
                    onChange={setPreference}
                    options={[
                      { value: 'light', label: t('admin.shell.themeLight') },
                      { value: 'dark', label: t('admin.shell.themeDark') },
                      { value: 'system', label: t('admin.shell.themeSystem') },
                    ]}
                  />
                </div>
                <div>
                  <p className="admin-label">{t('admin.shell.languageLabel')}</p>
                  <SegmentedControl
                    ariaLabel={t('admin.shell.languageLabel')}
                    value={language}
                    onChange={setLanguage}
                    options={languages.map((code) => ({ value: code, label: t(`languages.${code}`) }))}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </AdminPage>
  )
}

export default Account
