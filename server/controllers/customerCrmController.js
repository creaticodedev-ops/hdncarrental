import GuestCustomer from '../models/GuestCustomer.js';
import Booking from '../models/Booking.js';
import Contract from '../models/Contract.js';
import CustomerReview from '../models/CustomerReview.js';
import CustomerIssue from '../models/CustomerIssue.js';
import { logAudit } from '../utils/adminOps.js';
import { crmIdentityMatch } from '../utils/customerIdentity.js';
import {
  buildCustomer360,
  logCustomerActivity,
  ensureReferralCode,
} from '../services/customer360.js';
import { BRAND_NAME } from '../utils/brand.js';
import {
  buildWaMeUrl,
  normalizeWhatsAppDial,
} from '../services/whatsappNotify.js';
import { buildCustomerCareWhatsAppMessage } from '../../shared/customerCareWhatsApp.js';
import { GOOGLE_REVIEW_URL } from '../../shared/googleReview.js';
import { buildSignedContractWhatsAppMessage } from '../../shared/signedContractWhatsApp.js';
import { buildSignedContractShareUrl } from '../middleware/uploadAccess.js';
import { loyaltyBenefitsFor } from '../../shared/customerCrm.js';

const AGENCY_TZ = 'Africa/Casablanca';

const formatShareDateTime = (value, language = 'en') => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB';
  return d.toLocaleString(locale, {
    timeZone: AGENCY_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const vehicleLabel = (car) => {
  if (!car) return '—';
  const name = `${car.brand || ''} ${car.model || ''}`.trim();
  const plate = car.licensePlate ? ` (${car.licensePlate})` : '';
  return `${name}${plate}`.trim() || '—';
};

const loyaltyLabel = (level, language) => {
  const map = {
    en: { new: 'New', regular: 'Regular', gold: 'Gold', vip: 'VIP' },
    fr: { new: 'Nouveau', regular: 'Régulier', gold: 'Gold', vip: 'VIP' },
    es: { new: 'Nuevo', regular: 'Regular', gold: 'Gold', vip: 'VIP' },
  };
  const lang = ['fr', 'es'].includes(language) ? language : 'en';
  return map[lang][level] || level;
};

const loadGuest = async (ownerId, email) => {
  const normalized = decodeURIComponent(String(email || '')).trim().toLowerCase();
  if (!normalized) return { normalized: '', guest: null };
  const guest = await GuestCustomer.findOne({ owner: ownerId, email: normalized });
  return { normalized, guest };
};

const pickBooking = async (ownerId, crmKey, bookingId) => {
  if (bookingId) {
    const one = await Booking.findOne({ _id: bookingId, owner: ownerId, ...crmIdentityMatch(crmKey) })
      .populate('car', 'brand model licensePlate')
      .lean();
    if (one) return one;
  }
  return Booking.findOne({ owner: ownerId, ...crmIdentityMatch(crmKey) })
    .populate('car', 'brand model licensePlate')
    .sort({ createdAt: -1 })
    .lean();
};

export const getCustomer360 = async (req, res) => {
  try {
    const normalized = decodeURIComponent(req.params.email || '').trim().toLowerCase();
    const payload = await buildCustomer360(req.user._id, normalized);
    if (!payload) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error('[getCustomer360]', error.message);
    res.status(500).json({ success: false, message: 'Failed to load customer' });
  }
};

export const updateCustomerCare = async (req, res) => {
  try {
    const { normalized, guest } = await loadGuest(req.user._id, req.params.email);
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });

    const {
      contacted,
      satisfaction,
      notes,
      nextFollowUpAt,
      lastContactAt,
    } = req.body || {};

    guest.care = guest.care || {};
    if (typeof contacted === 'boolean') guest.care.contacted = contacted;
    if (satisfaction !== undefined) {
      const allowed = ['', 'excellent', 'good', 'neutral', 'poor'];
      if (!allowed.includes(satisfaction)) {
        return res.status(400).json({ success: false, message: 'Invalid satisfaction value' });
      }
      guest.care.satisfaction = satisfaction;
    }
    if (typeof notes === 'string') guest.care.notes = notes.slice(0, 4000);
    if (nextFollowUpAt !== undefined) {
      guest.care.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
      guest.nextFollowUpAt = guest.care.nextFollowUpAt;
    }
    if (lastContactAt || contacted === true) {
      const when = lastContactAt ? new Date(lastContactAt) : new Date();
      guest.care.lastContactAt = when;
      guest.lastContactAt = when;
      guest.care.contacted = true;
      await logCustomerActivity({
        owner: req.user._id,
        crmKey: normalized,
        type: 'customer_contacted',
        meta: { source: 'care' },
      });
    }
    await guest.save();

    await logAudit({
      owner: req.user._id,
      actor: req.user._id,
      action: 'customer.care',
      entityType: 'GuestCustomer',
      entityId: guest._id,
      details: `Updated care for ${guest.email}`,
    });

    const payload = await buildCustomer360(req.user._id, normalized);
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error('[updateCustomerCare]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update customer care' });
  }
};

export const createCustomerIssue = async (req, res) => {
  try {
    const { normalized, guest } = await loadGuest(req.user._id, req.params.email);
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });
    const reportedIssue = String(req.body?.reportedIssue || '').trim();
    if (!reportedIssue) {
      return res.status(400).json({ success: false, message: 'Issue description is required' });
    }
    const issue = await CustomerIssue.create({
      owner: req.user._id,
      crmKey: normalized,
      booking: req.body?.bookingId || null,
      reportedIssue: reportedIssue.slice(0, 4000),
      notes: String(req.body?.notes || '').slice(0, 4000),
      status: 'open',
      source: req.body?.source || 'care',
      createdBy: req.user._id,
    });
    await logCustomerActivity({
      owner: req.user._id,
      crmKey: normalized,
      type: 'complaint_created',
      booking: issue.booking,
      meta: { issueId: String(issue._id) },
    });
    const payload = await buildCustomer360(req.user._id, normalized);
    res.status(201).json({ success: true, issue, ...payload });
  } catch (error) {
    console.error('[createCustomerIssue]', error.message);
    res.status(500).json({ success: false, message: 'Failed to create issue' });
  }
};

export const updateCustomerIssue = async (req, res) => {
  try {
    const issue = await CustomerIssue.findOne({ _id: req.params.id, owner: req.user._id });
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    const { status, notes, reportedIssue } = req.body || {};
    if (status) {
      const allowed = ['open', 'in_progress', 'resolved'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid issue status' });
      }
      issue.status = status;
      issue.resolvedAt = status === 'resolved' ? new Date() : null;
      if (status === 'resolved') {
        await logCustomerActivity({
          owner: req.user._id,
          crmKey: issue.crmKey,
          type: 'complaint_resolved',
          booking: issue.booking,
          meta: { issueId: String(issue._id) },
        });
      }
    }
    if (typeof notes === 'string') issue.notes = notes.slice(0, 4000);
    if (typeof reportedIssue === 'string' && reportedIssue.trim()) {
      issue.reportedIssue = reportedIssue.trim().slice(0, 4000);
    }
    await issue.save();
    const payload = await buildCustomer360(req.user._id, issue.crmKey);
    res.json({ success: true, issue, ...payload });
  } catch (error) {
    console.error('[updateCustomerIssue]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update issue' });
  }
};

export const createCustomerReview = async (req, res) => {
  try {
    const { normalized, guest } = await loadGuest(req.user._id, req.params.email);
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });
    const rating = Number(req.body?.rating);
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating (1–5) is required' });
    }
    const low = rating <= 2;
    const review = await CustomerReview.create({
      owner: req.user._id,
      crmKey: normalized,
      booking: req.body?.bookingId || null,
      rating,
      feedback: String(req.body?.feedback || '').slice(0, 4000),
      status: low ? 'private' : 'received',
      complaintFlag: low || Boolean(req.body?.complaintFlag),
      internalResponse: String(req.body?.internalResponse || '').slice(0, 4000),
      createdBy: req.user._id,
    });
    await logCustomerActivity({
      owner: req.user._id,
      crmKey: normalized,
      type: 'review_received',
      booking: review.booking,
      meta: { rating, reviewId: String(review._id) },
    });

    let issue = null;
    if (review.complaintFlag) {
      issue = await CustomerIssue.create({
        owner: req.user._id,
        crmKey: normalized,
        booking: review.booking,
        reportedIssue: review.feedback || `Low rating (${rating}/5) after rental`,
        status: 'open',
        source: 'review',
        createdBy: req.user._id,
      });
      await logCustomerActivity({
        owner: req.user._id,
        crmKey: normalized,
        type: 'complaint_created',
        booking: review.booking,
        meta: { issueId: String(issue._id), fromReview: true },
      });
    }

    const payload = await buildCustomer360(req.user._id, normalized);
    res.status(201).json({
      success: true,
      review,
      issue,
      promptGoogle: false,
      googleReviewUrl: GOOGLE_REVIEW_URL,
      ...payload,
    });
  } catch (error) {
    console.error('[createCustomerReview]', error.message);
    res.status(500).json({ success: false, message: 'Failed to save review' });
  }
};

export const updateCustomerReview = async (req, res) => {
  try {
    const review = await CustomerReview.findOne({ _id: req.params.id, owner: req.user._id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (typeof req.body?.internalResponse === 'string') {
      review.internalResponse = req.body.internalResponse.slice(0, 4000);
    }
    if (typeof req.body?.complaintFlag === 'boolean') review.complaintFlag = req.body.complaintFlag;
    if (req.body?.status && ['received', 'private', 'google_prompted'].includes(req.body.status)) {
      review.status = req.body.status;
    }
    if (req.body?.googleDirected) {
      review.googleDirected = true;
      review.status = 'google_prompted';
    }
    await review.save();
    const payload = await buildCustomer360(req.user._id, review.crmKey);
    res.json({ success: true, review, ...payload });
  } catch (error) {
    console.error('[updateCustomerReview]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

export const updateCustomerReferral = async (req, res) => {
  try {
    const { normalized, guest } = await loadGuest(req.user._id, req.params.email);
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });
    await ensureReferralCode(guest);

    const code = String(req.body?.referredByCode || '').trim().toUpperCase();
    if (code) {
      if (code === guest.referralCode) {
        return res.status(400).json({ success: false, message: 'A customer cannot refer themselves' });
      }
      const referrer = await GuestCustomer.findOne({ owner: req.user._id, referralCode: code });
      if (!referrer) {
        return res.status(404).json({ success: false, message: 'Referral code not found' });
      }
      const previous = guest.referredByEmail;
      guest.referredByCode = code;
      guest.referredByEmail = referrer.email;
      if (previous !== referrer.email) {
        referrer.successfulReferrals = (referrer.successfulReferrals || 0) + 1;
        await referrer.save();
      }
    }
    if (typeof req.body?.referralBenefit === 'string') {
      guest.referralBenefit = req.body.referralBenefit.slice(0, 500);
    }
    await guest.save();
    const payload = await buildCustomer360(req.user._id, normalized);
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error('[updateCustomerReferral]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update referral' });
  }
};

export const completeFollowUp = async (req, res) => {
  try {
    const guest = await GuestCustomer.findOne({
      owner: req.user._id,
      'followUps._id': req.params.id,
    });
    if (!guest) return res.status(404).json({ success: false, message: 'Follow-up not found' });
    const item = guest.followUps.id(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Follow-up not found' });
    const nextStatus = req.body?.status === 'skipped' ? 'skipped' : 'done';
    item.status = nextStatus;
    item.completedAt = new Date();
    await guest.save();
    const payload = await buildCustomer360(req.user._id, guest.email);
    res.json({ success: true, ...payload });
  } catch (error) {
    console.error('[completeFollowUp]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update follow-up' });
  }
};

export const composeCustomerWhatsApp = async (req, res) => {
  try {
    const { normalized, guest } = await loadGuest(req.user._id, req.params.email);
    if (!guest) return res.status(404).json({ success: false, message: 'Customer not found' });

    const templateId = String(req.body?.templateId || '').trim();
    const language = req.body?.lang || 'en';
    const booking = await pickBooking(req.user._id, normalized, req.body?.bookingId);
    const dial = normalizeWhatsAppDial(guest.phone || booking?.customerPhone);
    if (!dial) {
      return res.status(400).json({
        success: false,
        code: 'NO_PHONE',
        message: 'Add the customer’s phone number to send a WhatsApp message.',
      });
    }

    await ensureReferralCode(guest);
    const vars = {
      language,
      brand: BRAND_NAME,
      name: guest.name || booking?.customerName || '',
      reservationId: booking?.reservationId || '',
      vehicle: vehicleLabel(booking?.car),
      pickup: formatShareDateTime(booking?.pickupDate, language),
      returnDate: formatShareDateTime(booking?.returnDate, language),
      referralCode: guest.referralCode,
      loyaltyLabel: loyaltyLabel(guest.loyaltyLevel, language),
      perkLine: loyaltyBenefitsFor(guest.loyaltyLevel).priorityService
        ? (language === 'fr' ? ', priorité au comptoir' : language === 'es' ? ', prioridad en agencia' : ', priority at the desk')
        : '',
      reviewLink: GOOGLE_REVIEW_URL,
      link: '',
    };

    let message = '';
    if (templateId === 'signed_contract') {
      const signed = Boolean(booking?.completion?.signatureComplete)
        || booking?.completion?.requestStatus === 'signed';
      if (!booking || !signed) {
        return res.status(409).json({
          success: false,
          code: 'NOT_SIGNED',
          message: 'The contract must be fully signed before it can be shared.',
        });
      }
      const contract = await Contract.findOne({ owner: req.user._id, booking: booking._id })
        .sort({ updatedAt: -1 })
        .select('_id')
        .lean();
      if (!contract) {
        return res.status(409).json({
          success: false,
          code: 'NO_PDF',
          message: 'The signed contract PDF is not available yet.',
        });
      }
      vars.link = buildSignedContractShareUrl(booking._id);
      message = buildSignedContractWhatsAppMessage(vars);
    } else {
      message = buildCustomerCareWhatsAppMessage({ templateId, ...vars });
      if (!message) {
        return res.status(400).json({ success: false, message: 'Unknown WhatsApp template' });
      }
    }

    const whatsappUrl = buildWaMeUrl(message, dial);
    guest.lastContactAt = new Date();
    guest.care = guest.care || {};
    guest.care.lastContactAt = guest.lastContactAt;
    guest.care.contacted = true;

    if (booking && templateId) {
      const kindMap = {
        signed_contract: 'signed_contract',
        during_rental: 'during_rental',
        return_reminder: 'return_reminder',
        thank_you: 'thank_you',
        review_request: 'review',
        winback: 'winback',
      };
      const kind = kindMap[templateId];
      if (kind) {
        const open = (guest.followUps || []).find(
          (f) => f.status === 'due' && f.kind === kind && String(f.booking || '') === String(booking._id),
        );
        if (open) {
          open.status = 'done';
          open.completedAt = new Date();
        }
      }
    }
    await guest.save();

    await logCustomerActivity({
      owner: req.user._id,
      crmKey: normalized,
      type: 'whatsapp_sent',
      booking: booking?._id || null,
      meta: { templateId, preview: message.slice(0, 180) },
    });

    if (templateId === 'review_request') {
      await logCustomerActivity({
        owner: req.user._id,
        crmKey: normalized,
        type: 'review_requested',
        booking: booking?._id || null,
      });
    }

    res.json({
      success: true,
      whatsappUrl,
      message,
      customerDial: dial,
      templateId,
    });
  } catch (error) {
    console.error('[composeCustomerWhatsApp]', error.message);
    res.status(500).json({ success: false, message: 'Could not prepare WhatsApp' });
  }
};

export default {
  getCustomer360,
  updateCustomerCare,
  createCustomerIssue,
  updateCustomerIssue,
  createCustomerReview,
  updateCustomerReview,
  updateCustomerReferral,
  completeFollowUp,
  composeCustomerWhatsApp,
};
