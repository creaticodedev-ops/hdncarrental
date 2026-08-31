import React, { useEffect, useState } from 'react';
import Title from '../../components/owner/Title';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import { customerEmail } from '../../utils/customerEmail';
import { downloadXlsx } from '../../utils/downloadXlsx';
import CustomerWorkspace from '../../components/owner/customers/CustomerWorkspace';
import {
  LIST_FILTERS,
  SMART_TONES,
  initials,
} from '../../components/owner/customers/crmPresentation';

const emptyFilters = {
  search: '',
  status: '',
  city: '',
  minRating: '',
  minBookings: '',
  minSpent: '',
  sortBy: 'lastBookingAt',
  filter: '',
};

const Customers = () => {
  const { axios, currency } = useAppContext();
  const { t, language } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(applied).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await axios.get(`/api/owner/crm/customers?${params}`);
      if (data.success) setCustomers(data.customers);
      else toast.error(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [applied]);

  const openDetail = async (customer) => {
    setSelected(customer);
    setDetail(null);
    try {
      const { data } = await axios.get(`/api/owner/crm/customers/${encodeURIComponent(customer.email)}`);
      if (data.success) setDetail(data);
      else toast.error(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const applyPayload = (payload) => {
    if (payload?.customer) setDetail(payload);
    else if (selected) openDetail(selected);
    fetchCustomers();
  };

  const setStatus = async (status) => {
    if (!selected) return;
    let blacklistReason = '';
    if (status === 'blacklisted') {
      blacklistReason = window.prompt(t('admin.customers.blacklistPrompt')) || '';
    }
    try {
      const { data } = await axios.post('/api/owner/crm/status', {
        email: selected.email,
        status,
        blacklistReason,
      });
      if (data.success) {
        toast.success(t('admin.customers.statusUpdated'));
        openDetail(selected);
        fetchCustomers();
      } else toast.error(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const params = {};
      Object.entries(applied).forEach(([k, v]) => { if (v) params[k] = v; });
      await downloadXlsx(axios, '/api/owner/crm/customers/export', {
        params,
        language,
        fallbackName: 'customers.xlsx',
      });
      toast.success(t('admin.common.exportSuccess'));
    } catch (error) {
      toast.error(getErrorMessage(error) || t('admin.common.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const closeWorkspace = () => { setSelected(null); setDetail(null); };

  const directory = (
    <div className={`crm-directory ${selected ? 'max-xl:hidden' : ''}`}>
      <div className={`crm-toolbar mb-4 ${selected ? 'hidden xl:flex' : ''}`}>
            <input
              className="admin-input crm-search"
              placeholder={t('admin.customers.search')}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setApplied({ ...filters }); } }}
            />
            <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setApplied({ ...filters })}>
              {t('admin.customers.apply')}
            </button>
            {selected ? null : (
            <button type="button" disabled={exporting} onClick={exportExcel} className="admin-btn admin-btn-secondary admin-btn-sm">
              {exporting ? t('admin.common.exporting') : t('admin.common.exportExcel')}
            </button>
            )}
          </div>
          <div className={`crm-chip-row mb-4 ${selected ? 'hidden xl:flex' : ''}`}>
            {LIST_FILTERS.map((id) => (
              <button
                key={id || 'all'}
                type="button"
                className="crm-chip"
                aria-pressed={applied.filter === id}
                onClick={() => {
                  const next = { ...filters, filter: id };
                  setFilters(next);
                  setApplied(next);
                }}
              >
                {id ? t(`admin.customers.filter.${id}`) : t('admin.customers.filterAll')}
              </button>
            ))}
            <button type="button" className="crm-chip" aria-pressed={moreFilters} onClick={() => setMoreFilters((v) => !v)}>
              {t('admin.customers.moreFilters')}
            </button>
          </div>
          {moreFilters ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters }); }}
              className={`mb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 crm-surface ${selected ? 'hidden xl:grid' : ''}`}
            >
              <select className="admin-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">{t('admin.customers.allStatuses')}</option>
                <option value="new">{t('admin.customers.loyalty.new')}</option>
                <option value="regular">{t('admin.customers.regular')}</option>
                <option value="vip">{t('admin.customers.vip')}</option>
                <option value="blacklisted">{t('admin.customers.blacklist')}</option>
              </select>
              <input className="admin-input" placeholder={t('admin.customers.city')} value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
              <input type="number" min="0" className="admin-input" placeholder={t('admin.customers.minBookings')} value={filters.minBookings} onChange={(e) => setFilters({ ...filters, minBookings: e.target.value })} />
              <input type="number" min="0" className="admin-input" placeholder={t('admin.customers.minSpending')} value={filters.minSpent} onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })} />
              <select className="admin-input" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
                <option value="lastBookingAt">{t('admin.customers.sortLast')}</option>
                <option value="totalSpent">{t('admin.customers.sortSpent')}</option>
                <option value="totalReservations">{t('admin.customers.sortBookings')}</option>
                <option value="rating">{t('admin.customers.sortRating')}</option>
                <option value="name">{t('admin.customers.sortName')}</option>
              </select>
              <button type="button" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }} className="admin-btn admin-btn-secondary">
                {t('admin.customers.clear')}
              </button>
            </form>
          ) : null}

      <div className="crm-person-list">
        {loading ? (
          <>
            <div className="admin-skeleton crm-skel is-row" />
            <div className="admin-skeleton crm-skel is-row" />
            <div className="admin-skeleton crm-skel is-row" />
          </>
        ) : customers.length === 0 ? (
          <div className="crm-empty crm-surface">
            <p>{t('admin.customers.none')}</p>
            <span>{t('admin.customers.selectHint')}</span>
          </div>
        ) : customers.map((c) => (
          <button
            key={c._id}
            type="button"
            className={`crm-person ${selected?.email === c.email ? 'is-active' : ''}`}
            onClick={() => openDetail(c)}
          >
            <span className="crm-mono" data-tier={c.loyaltyLevel}>{initials(c.name)}</span>
            <span className="crm-person-meta">
              <span className="crm-person-name">{c.name}</span>
            <span className="crm-person-sub">{[c.phone || customerEmail(c), c.city].filter(Boolean).join(' · ') || '—'}</span>
            </span>
            <span className="crm-person-side">
              <span className="crm-pulse" data-tone={c.smartStatus === 'vip' ? 'vip' : (SMART_TONES[c.smartStatus] || 'neutral')} data-live={c.flags?.hasActiveRental ? 'true' : 'false'}>
                <i />
                <span>{t(`admin.customers.smart.${c.smartStatus || 'inactive'}`)}</span>
              </span>
              <span className="crm-person-rev text-xs text-[var(--admin-muted)]">{currency}{c.totalSpent || 0}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-page-pad flex-1 pb-12 min-w-0 overflow-x-clip">
      {!selected ? (
        <Title
          title={t('admin.customers.title')}
          subTitle={t('admin.customers.subtitle')}
        />
      ) : null}

      <div className={`crm-shell ${selected ? 'is-open mt-0' : 'mt-2'}`}>
        {directory}
        {selected ? (
          <div className="crm-canvas">
            {!detail ? (
            <div className="admin-skeleton crm-skel" />
            ) : (
              <CustomerWorkspace
                axios={axios}
                detail={detail}
                currency={currency}
                language={language}
                t={t}
                onReload={applyPayload}
                onSetStatus={setStatus}
                onClose={closeWorkspace}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Customers;
