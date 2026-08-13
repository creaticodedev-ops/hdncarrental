/**
 * Shared CRUD helpers for owner-scoped directory entities
 * (Chauffeur, Samsar, PartnerCompany).
 */
import mongoose from 'mongoose';
import { escapeRegex, isValidEmail } from '../utils/helpers.js';

export const ACTIVE_STATUSES = ['active', 'inactive'];

const toDateOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const clampMoney = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
};

const normalizeEmail = (email) => {
  const v = String(email || '').trim().toLowerCase();
  if (!v) return '';
  if (!isValidEmail(v)) {
    const err = new Error('Please provide a valid email address');
    err.status = 400;
    throw err;
  }
  return v;
};

export const normalizeChauffeurInput = (body = {}, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.fullName !== undefined) {
    const fullName = String(body.fullName || '').trim();
    if (!fullName) {
      const err = new Error('Full name is required');
      err.status = 400;
      throw err;
    }
    out.fullName = fullName.slice(0, 200);
  }
  if (!partial || body.phone !== undefined) out.phone = String(body.phone || '').trim().slice(0, 40);
  if (!partial || body.email !== undefined) out.email = normalizeEmail(body.email);
  if (!partial || body.address !== undefined) out.address = String(body.address || '').trim().slice(0, 500);
  if (!partial || body.licenseNumber !== undefined) {
    out.licenseNumber = String(body.licenseNumber || '').trim().slice(0, 100);
  }
  if (!partial || body.licenseExpiry !== undefined) {
    out.licenseExpiry = toDateOrNull(body.licenseExpiry);
  }
  if (!partial || body.status !== undefined) {
    out.status = ACTIVE_STATUSES.includes(body.status) ? body.status : 'active';
  }
  if (!partial || body.notes !== undefined) out.notes = String(body.notes || '').slice(0, 5000);
  return out;
};

export const normalizeSamsarInput = (body = {}, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.fullName !== undefined) {
    const fullName = String(body.fullName || '').trim();
    if (!fullName) {
      const err = new Error('Full name is required');
      err.status = 400;
      throw err;
    }
    out.fullName = fullName.slice(0, 200);
  }
  if (!partial || body.phone !== undefined) out.phone = String(body.phone || '').trim().slice(0, 40);
  if (!partial || body.email !== undefined) out.email = normalizeEmail(body.email);
  if (!partial || body.address !== undefined) out.address = String(body.address || '').trim().slice(0, 500);
  if (!partial || body.commissionType !== undefined || body.commissionValue !== undefined) {
    const type = body.commissionType === 'fixed' ? 'fixed' : 'percent';
    out.commissionType = type;
    let value = clampMoney(body.commissionValue, type === 'percent' ? 10 : 0);
    if (type === 'percent') value = Math.min(100, value);
    out.commissionValue = value;
  }
  if (!partial || body.status !== undefined) {
    out.status = ACTIVE_STATUSES.includes(body.status) ? body.status : 'active';
  }
  if (!partial || body.notes !== undefined) out.notes = String(body.notes || '').slice(0, 5000);
  return out;
};

export const normalizePartnerCompanyInput = (body = {}, { partial = false } = {}) => {
  const out = {};
  if (!partial || body.companyName !== undefined) {
    const companyName = String(body.companyName || '').trim();
    if (!companyName) {
      const err = new Error('Company name is required');
      err.status = 400;
      throw err;
    }
    out.companyName = companyName.slice(0, 200);
  }
  if (!partial || body.legalName !== undefined) {
    out.legalName = String(body.legalName || '').trim().slice(0, 200);
  }
  if (!partial || body.contactName !== undefined) {
    out.contactName = String(body.contactName || '').trim().slice(0, 200);
  }
  if (!partial || body.phone !== undefined) out.phone = String(body.phone || '').trim().slice(0, 40);
  if (!partial || body.email !== undefined) out.email = normalizeEmail(body.email);
  if (!partial || body.address !== undefined) out.address = String(body.address || '').trim().slice(0, 500);
  if (!partial || body.taxId !== undefined) out.taxId = String(body.taxId || '').trim().slice(0, 100);
  if (!partial || body.registrationNumber !== undefined) {
    out.registrationNumber = String(body.registrationNumber || '').trim().slice(0, 100);
  }
  if (!partial || body.status !== undefined) {
    out.status = ACTIVE_STATUSES.includes(body.status) ? body.status : 'active';
  }
  if (!partial || body.notes !== undefined) out.notes = String(body.notes || '').slice(0, 5000);
  return out;
};

/**
 * Paginated owner-scoped list with search + status filter.
 */
export const listDirectoryEntities = async (
  Model,
  ownerId,
  {
    q = '',
    status = '',
    page = 1,
    limit = 20,
    sort = '-createdAt',
    searchFields = ['fullName', 'phone', 'email'],
  } = {},
) => {
  const filter = { owner: ownerId };
  if (ACTIVE_STATUSES.includes(status)) filter.status = status;

  const query = String(q || '').trim();
  if (query) {
    const rx = new RegExp(escapeRegex(query), 'i');
    filter.$or = searchFields.map((field) => ({ [field]: rx }));
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const lim = Math.min(100, Math.max(1, Number(limit) || 20));

  let sortSpec = { createdAt: -1 };
  if (sort === 'name' || sort === 'fullName' || sort === 'companyName') {
    sortSpec = searchFields.includes('companyName')
      ? { companyName: 1 }
      : { fullName: 1 };
  } else if (sort === '-name' || sort === '-fullName' || sort === '-companyName') {
    sortSpec = searchFields.includes('companyName')
      ? { companyName: -1 }
      : { fullName: -1 };
  } else if (sort === 'createdAt') {
    sortSpec = { createdAt: 1 };
  }

  const [items, total] = await Promise.all([
    Model.find(filter)
      .sort(sortSpec)
      .skip((pageNum - 1) * lim)
      .limit(lim)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    },
  };
};

export const getOwnedEntity = async (Model, ownerId, id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Model.findOne({ _id: id, owner: ownerId });
};

export default {
  ACTIVE_STATUSES,
  normalizeChauffeurInput,
  normalizeSamsarInput,
  normalizePartnerCompanyInput,
  listDirectoryEntities,
  getOwnedEntity,
};
