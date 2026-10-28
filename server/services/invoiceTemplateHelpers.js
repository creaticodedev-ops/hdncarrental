import { buildImageHtml } from './templateEngine.js';
import { resolveCompanyStampAssetUrl } from './companyBrandingService.js';
import { amountToFrenchMadWords } from '../utils/frenchAmountInWords.js';

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
 * Falls back to a single service line when items are empty but a total exists.
 * Montant column shows gross (qty × unit); line discounts appear under the designation
 * and roll into the Remise summary — never double-counted.
 */
export const buildInvoiceItemsHtml = (items = [], { currency = 'MAD', fallbackDescription = 'Prestation', fallbackAmount = 0 } = {}) => {
  const rows = Array.isArray(items) ? items.filter((item) => item && (item.description || item.unitPrice || item.quantity)) : [];
  const effective = rows.length
    ? rows
    : [{ description: fallbackDescription, quantity: 1, unitPrice: fallbackAmount, taxRate: 0, discountAmount: 0 }];

  return effective
    .map((item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const gross = qty * unit;
      const lineDiscount = Number(item.discountAmount) || 0;
      const details = String(item.details || '').trim();
      const discountNote = lineDiscount > 0
        ? `<div class="inv-line-details">Remise ligne : − ${escapeHtml(money(lineDiscount, currency))}</div>`
        : '';
      const designation = [
        escapeHtml(item.description || '—'),
        details ? `<div class="inv-line-details">${escapeHtml(details)}</div>` : '',
        discountNote,
      ].join('');
      return `<tr>
  <td class="inv-col-desc">${designation}</td>
  <td class="inv-col-qty">${escapeHtml(String(qty))}</td>
  <td class="inv-col-unit">${escapeHtml(money(unit, currency))}</td>
  <td class="inv-col-amount">${escapeHtml(money(gross, currency))}</td>
</tr>`;
    })
    .join('\n');
};

/** Rental / vehicle block — omitted entirely for free invoices. */
export const buildInvoiceRentalSectionHtml = ({
  show = false,
  carMake = '',
  carRegistration = '',
  rentalDays = '',
  reservationId = '',
  pickupDate = '',
  returnDate = '',
  pickupLocation = '',
  returnLocation = '',
} = {}) => {
  if (!show) return '';
  const daysLabel = rentalDays ? `${escapeHtml(String(rentalDays))} jour(s)` : '—';
  return `<div class="inv-rental">
  <p class="inv-section-label">Détails de la location</p>
  <div class="inv-rental-grid">
    <div class="inv-rental-item"><span>Véhicule</span><strong>${escapeHtml(carMake || '—')}</strong></div>
    <div class="inv-rental-item"><span>Immatriculation</span><strong>${escapeHtml(carRegistration || '—')}</strong></div>
    <div class="inv-rental-item"><span>Durée</span><strong>${daysLabel}</strong></div>
    <div class="inv-rental-item"><span>Réservation</span><strong>${escapeHtml(reservationId || '—')}</strong></div>
    <div class="inv-rental-item"><span>Départ</span><strong>${escapeHtml(pickupDate || '—')}</strong></div>
    <div class="inv-rental-item"><span>Retour</span><strong>${escapeHtml(returnDate || '—')}</strong></div>
    <div class="inv-rental-item"><span>Lieu de départ</span><strong>${escapeHtml(pickupLocation || '—')}</strong></div>
    <div class="inv-rental-item"><span>Lieu de retour</span><strong>${escapeHtml(returnLocation || '—')}</strong></div>
  </div>
</div>`;
};

export const buildInvoiceReservationMetaHtml = (reservationId) => {
  const id = String(reservationId || '').trim();
  if (!id || id === '—' || id.toUpperCase() === 'PREVIEW') return '';
  return `<div><span>Réservation</span><strong>${escapeHtml(id)}</strong></div>`;
};

export const buildInvoiceAmountInWordsHtml = (totalAmount, currency = 'MAD') => {
  const { sentence, words } = amountToFrenchMadWords(totalAmount, { currency });
  // Highlight the amount words within the fixed French formula.
  const highlighted = escapeHtml(sentence).replace(
    escapeHtml(words),
    `<strong>${escapeHtml(words)}</strong>`,
  );
  return `<div class="inv-amount-words">
  <p class="inv-section-label">Arrêtée à</p>
  <p class="inv-amount-words-text">${highlighted}</p>
</div>`;
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
  buildInvoiceRentalSectionHtml,
  buildInvoiceReservationMetaHtml,
  buildInvoiceAmountInWordsHtml,
  buildInvoiceDiscountRowHtml,
  buildInvoiceTaxRowHtml,
  buildCompanyCachetSignatureHtml,
  resolveAmountPaid,
};
