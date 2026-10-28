import { buildImageHtml } from './templateEngine.js';
import { resolveCompanyStampAssetUrl } from './companyBrandingService.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (amount, currency = 'MAD') => {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} ${currency}`.trim();
};

const PAYMENT_STATUS_LABELS = {
  pending: 'En attente',
  paid: 'Payée',
  partial: 'Partiellement payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const PAYMENT_METHOD_LABELS = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  bank_transfer: 'Virement',
  transfer: 'Virement',
  check: 'Chèque',
  cheque: 'Chèque',
  online: 'En ligne',
  other: 'Autre',
};

export const formatInvoiceMoney = money;

export const invoicePaymentStatusLabel = (status) =>
  PAYMENT_STATUS_LABELS[String(status || '').toLowerCase()] || String(status || '—');

export const invoicePaymentMethodLabel = (method) =>
  PAYMENT_METHOD_LABELS[String(method || '').toLowerCase()] || (method ? String(method) : '—');

export const formatInvoiceDate = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' });
};

/**
 * Build invoice line-item table rows.
 * Falls back to a single rental line when items are empty but a total exists.
 */
export const buildInvoiceItemsHtml = (items = [], { currency = 'MAD', fallbackDescription = 'Location de véhicule', fallbackAmount = 0 } = {}) => {
  const rows = Array.isArray(items) ? items.filter((item) => item && (item.description || item.unitPrice || item.quantity)) : [];
  const effective = rows.length
    ? rows
    : [{ description: fallbackDescription, quantity: 1, unitPrice: fallbackAmount, taxRate: 0 }];

  return effective
    .map((item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const amount = qty * unit;
      return `<tr>
  <td class="inv-col-desc">${escapeHtml(item.description || '—')}</td>
  <td class="inv-col-qty">${escapeHtml(String(qty))}</td>
  <td class="inv-col-unit">${escapeHtml(money(unit, currency))}</td>
  <td class="inv-col-amount">${escapeHtml(money(amount, currency))}</td>
</tr>`;
    })
    .join('\n');
};

export const buildInvoiceDiscountRowHtml = (discountAmount, currency = 'MAD') => {
  const amount = Number(discountAmount) || 0;
  if (amount <= 0) return '';
  return `<div class="inv-sum-row"><span>Remise</span><strong>− ${escapeHtml(money(amount, currency))}</strong></div>`;
};

export const buildInvoiceTaxRowHtml = (taxAmount, currency = 'MAD') => {
  const amount = Number(taxAmount) || 0;
  if (amount <= 0) return '';
  return `<div class="inv-sum-row"><span>TVA</span><strong>${escapeHtml(money(amount, currency))}</strong></div>`;
};

/**
 * Premium "Cachet et signature" block.
 * Never fabricates images — empty reserved area when no assets are configured.
 */
export const buildCompanyCachetSignatureHtml = (agency = {}, { includeCompanyStamp = true } = {}) => {
  if (!includeCompanyStamp) {
    return `<div class="inv-cachet is-empty"><p class="inv-cachet-title">Cachet et signature</p><div class="inv-cachet-box" aria-hidden="true"></div></div>`;
  }

  const combined = agency.combinedStampSignatureUrl || '';
  const stamp = agency.stampUrl || '';
  const signature = agency.signatureUrl || agency.companySignatureUrl || '';
  const fallback = resolveCompanyStampAssetUrl(agency);

  if (combined) {
    return `<div class="inv-cachet">
  <p class="inv-cachet-title">Cachet et signature</p>
  <div class="inv-cachet-box is-filled">${buildImageHtml(combined, 'Cachet et signature', 'max-height:110px;max-width:240px;')}</div>
</div>`;
  }

  if (stamp || signature) {
    return `<div class="inv-cachet">
  <p class="inv-cachet-title">Cachet et signature</p>
  <div class="inv-cachet-box is-filled inv-cachet-split">
    ${stamp ? buildImageHtml(stamp, 'Cachet', 'max-height:96px;max-width:140px;') : '<span class="inv-cachet-slot"></span>'}
    ${signature ? buildImageHtml(signature, 'Signature', 'max-height:72px;max-width:160px;') : '<span class="inv-cachet-slot"></span>'}
  </div>
</div>`;
  }

  if (fallback) {
    return `<div class="inv-cachet">
  <p class="inv-cachet-title">Cachet et signature</p>
  <div class="inv-cachet-box is-filled">${buildImageHtml(fallback, 'Cachet et signature', 'max-height:110px;max-width:240px;')}</div>
</div>`;
  }

  return `<div class="inv-cachet is-empty">
  <p class="inv-cachet-title">Cachet et signature</p>
  <div class="inv-cachet-box" aria-hidden="true"></div>
</div>`;
};

export const resolveAmountPaid = ({ paymentStatus, totalAmount, amountPaid, booking } = {}) => {
  if (amountPaid !== undefined && amountPaid !== null && amountPaid !== '') {
    const n = Number(amountPaid);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const fromBooking = booking?.completion?.amountPaid ?? booking?.amountPaid;
  if (fromBooking !== undefined && fromBooking !== null && fromBooking !== '') {
    const n = Number(fromBooking);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const status = String(paymentStatus || '').toLowerCase();
  const total = Number(totalAmount) || 0;
  if (status === 'paid') return total;
  return 0;
};

export default {
  formatInvoiceMoney,
  formatInvoiceDate,
  invoicePaymentStatusLabel,
  invoicePaymentMethodLabel,
  buildInvoiceItemsHtml,
  buildInvoiceDiscountRowHtml,
  buildInvoiceTaxRowHtml,
  buildCompanyCachetSignatureHtml,
  resolveAmountPaid,
};
