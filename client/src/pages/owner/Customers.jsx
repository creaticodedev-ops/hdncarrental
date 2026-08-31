import React, { useEffect, useState } from 'react';
import Title from '../../components/owner/Title';
import { useAppContext } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiError';
import { customerEmail } from '../../utils/customerEmail';
import { downloadXlsx } from '../../utils/downloadXlsx';
import { StatusBadge } from '../../admin/ui';
import CustomerWorkspace from '../../components/owner/customers/CustomerWorkspace';
import {
  LIST_FILTERS,
  SMART_DOT,
  SMART_TONES,
  LOYALTY_TONES,
  formatDay,
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

  const inputClass = 'admin-input w-full';

  return (
    <div className="admin-page-pad flex-1 pb-12 min-w-0">
      <Title
        title={t('admin.customers.title')}
        subTitle={t('admin.customers.subtitle')}
        secondaryAction={
          <button type="button" disabled={exporting} onClick={exportExcel} className="admin-btn admin-btn-secondary">
            {exporting ? t('admin.common.exporting') : t('admin.common.exportExcel')}
          </button>
        }
      />

      <div className="crm-chip-row mt-4">
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
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters }); }}
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 admin-card p-3 sm:p-4"
      >
        <input className={inputClass} placeholder={t('admin.customers.search')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">{t('admin.customers.allStatuses')}</option>
          <option value="new">{t('admin.customers.loyalty.new')}</option>
          <option value="regular">{t('admin.customers.regular')}</option>
          <option value="vip">{t('admin.customers.vip')}</option>
          <option value="blacklisted">{t('admin.customers.blacklist')}</option>
        </select>
        <input className={inputClass} placeholder={t('admin.customers.city')} value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
        <select className={inputClass} value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}>
          <option value="">{t('admin.customers.minRating')}</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5</option>
        </select>
        <input type="number" min="0" className={inputClass} placeholder={t('admin.customers.minBookings')} value={filters.minBookings} onChange={(e) => setFilters({ ...filters, minBookings: e.target.value })} />
        <input type="number" min="0" className={inputClass} placeholder={t('admin.customers.minSpending')} value={filters.minSpent} onChange={(e) => setFilters({ ...filters, minSpent: e.target.value })} />
        <select className={inputClass} value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
          <option value="lastBookingAt">{t('admin.customers.sortLast')}</option>
          <option value="totalSpent">{t('admin.customers.sortSpent')}</option>
          <option value="totalReservations">{t('admin.customers.sortBookings')}</option>
          <option value="rating">{t('admin.customers.sortRating')}</option>
          <option value="name">{t('admin.customers.sortName')}</option>
        </select>
        <div className="flex flex-col sm:flex-row gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="admin-btn admin-btn-primary">{t('admin.customers.apply')}</button>
          <button type="button" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }} className="admin-btn admin-btn-secondary">{t('admin.customers.clear')}</button>
        </div>
      </form>

      <div className={`mt-6 grid gap-6 ${selected ? 'xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]' : ''}`}>
        <div className={`admin-card overflow-hidden ${selected ? 'max-xl:hidden' : ''}`}>
          <div className="table-scroll">
            <table className="w-full text-sm text-left max-lg:min-w-[920px]">
              <thead className="bg-[var(--admin-table-head)] text-[var(--admin-muted)]">
                <tr>
                  <th className="p-3">{t('admin.bookings.customer')}</th>
                  <th className="p-3">{t('admin.customers.colPhone')}</th>
                  <th className="p-3">{t('admin.customers.bookings')}</th>
                  <th className="p-3">{t('admin.customers.lastBooking')}</th>
                  <th className="p-3">{t('admin.customers.spent')}</th>
                  <th className="p-3">{t('admin.customers.loyaltyCol')}</th>
                  <th className="p-3">{t('admin.customers.status')}</th>
                  <th className="p-3">{t('admin.customers.lastContact')}</th>
                  <th className="p-3">{t('admin.customers.issueCol')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="p-6 text-center text-[var(--admin-muted)]">{t('admin.customers.loading')}</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan="9" className="p-6 text-center text-[var(--admin-muted)]">{t('admin.customers.none')}</td></tr>
                ) : customers.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-t border-[var(--admin-border)] hover:bg-[var(--admin-hover)] cursor-pointer ${selected?.email === c.email ? 'bg-[var(--admin-primary-soft)]' : ''}`}
                    onClick={() => openDetail(c)}
                  >
                    <td className="p-3">
                      <p className="font-medium text-[var(--admin-ink)]">{c.name}</p>
                      <p className="text-xs text-[var(--admin-muted)]">{customerEmail(c) || '—'}</p>
                    </td>
                    <td className="p-3 text-xs">{c.phone || '—'}</td>
                    <td className="p-3">{c.totalReservations}</td>
                    <td className="p-3 text-xs">{formatDay(c.lastBookingAt, language)}</td>
                    <td className="p-3">{currency}{c.totalSpent || 0}</td>
                    <td className="p-3">
                      <StatusBadge tone={LOYALTY_TONES[c.loyaltyLevel] || 'neutral'}>
                        {t(`admin.customers.loyalty.${c.loyaltyLevel || 'new'}`)}
                      </StatusBadge>
                    </td>
                    <td className="p-3">
                      <StatusBadge tone={SMART_TONES[c.smartStatus] || 'neutral'}>
                        {SMART_DOT[c.smartStatus] || ''} {t(`admin.customers.smart.${c.smartStatus || 'inactive'}`)}
                      </StatusBadge>
                    </td>
                    <td className="p-3 text-xs">{formatDay(c.lastContactAt || c.care?.lastContactAt, language)}</td>
                    <td className="p-3 text-xs">{c.flags?.hasOpenIssue ? t('admin.customers.hasIssue') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected ? (
          <div className="admin-card p-4 md:p-5 h-max xl:sticky xl:top-24 min-w-0">
            <button
              type="button"
              className="admin-btn admin-btn-ghost text-xs mb-3"
              onClick={() => { setSelected(null); setDetail(null); }}
            >
              {t('admin.customers.backToList')}
            </button>
            {!detail ? (
              <p className="text-[var(--admin-muted)] text-sm">{t('admin.common.loading')}</p>
            ) : (
              <CustomerWorkspace
                axios={axios}
                detail={detail}
                currency={currency}
                language={language}
                t={t}
                onReload={applyPayload}
                onSetStatus={setStatus}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Customers;
