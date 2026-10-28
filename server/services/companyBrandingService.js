/**
 * Centralized HDN CAR company / invoice branding.
 * Official legal identifiers are the single source of truth for defaults —
 * AgencySettings.companyProfile may override any field without inventing new IDs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileToDataUri } from '../utils/templateAssets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OFFICIAL_COMPANY_PROFILE = Object.freeze({
  name: 'HDN CAR',
  addressLine1: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI',
  addressLine2: 'SAFI, MAROC',
  address: 'AB IBN BATTOUTA, QUARTIER AZIB DERAI, SAFI, MAROC',
  phone: '+212 661 865 184',
  email: 'haddanecar@gmail.com',
  ice: '003790056000093',
  if: '68379943',
  rc: '16263',
  accentColor: '#8F1F1F',
  paymentInstructions: '',
  invoiceFooter: '',
  logoUrl: '',
  stampUrl: '',
  signatureUrl: '',
  combinedStampSignatureUrl: '',
});

/** Bundled HDN CAR logo candidates (server-side, Puppeteer-safe). */
const DEFAULT_LOGO_CANDIDATES = [
  path.join(__dirname, '..', 'assets', 'branding', 'hdn-car-logo.webp'),
  path.join(__dirname, '..', 'assets', 'branding', 'hdn-car-logo.png'),
  path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'logo.webp'),
  path.join(__dirname, '..', '..', 'client', 'public', 'images', 'logo.png'),
];

let cachedDefaultLogoDataUri = null;

/** Embed the official project logo as a data URI for PDF/preview reliability. */
export const resolveDefaultCompanyLogoDataUri = () => {
  if (cachedDefaultLogoDataUri) return cachedDefaultLogoDataUri;
  for (const candidate of DEFAULT_LOGO_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    const dataUri = fileToDataUri(candidate);
    if (dataUri) {
      cachedDefaultLogoDataUri = dataUri;
      return dataUri;
    }
  }
  return '';
};

const trim = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const pick = (stored, key, fallback = OFFICIAL_COMPANY_PROFILE[key]) => {
  const value = trim(stored?.[key]);
  return value || fallback || '';
};

/** Normalize a stored companyProfile document into a complete branding object. */
export const normalizeCompanyProfile = (raw = {}) => {
  const addressLine1 = pick(raw, 'addressLine1');
  const addressLine2 = pick(raw, 'addressLine2');
  const address =
    trim(raw.address)
    || [addressLine1, addressLine2].filter(Boolean).join(', ')
    || OFFICIAL_COMPANY_PROFILE.address;

  return {
    name: pick(raw, 'name'),
    addressLine1,
    addressLine2,
    address,
    phone: pick(raw, 'phone'),
    email: pick(raw, 'email'),
    ice: pick(raw, 'ice'),
    if: pick(raw, 'if'),
    rc: pick(raw, 'rc'),
    accentColor: pick(raw, 'accentColor') || OFFICIAL_COMPANY_PROFILE.accentColor,
    paymentInstructions: trim(raw.paymentInstructions),
    invoiceFooter: trim(raw.invoiceFooter),
    logoUrl: trim(raw.logoUrl),
    stampUrl: trim(raw.stampUrl),
    signatureUrl: trim(raw.signatureUrl),
    combinedStampSignatureUrl: trim(raw.combinedStampSignatureUrl),
  };
};

/** Shape expected by buildTemplateVariables as the `agency` option. */
export const companyProfileToAgency = (profile) => {
  const p = normalizeCompanyProfile(profile);
  const taxParts = [
    p.ice ? `ICE ${p.ice}` : '',
    p.if ? `IF ${p.if}` : '',
    p.rc ? `RC ${p.rc}` : '',
  ].filter(Boolean);

  return {
    name: p.name,
    phone: p.phone,
    email: p.email,
    address: p.address,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    ice: p.ice,
    if: p.if,
    rc: p.rc,
    taxId: taxParts.join(' · ') || '—',
    accentColor: p.accentColor,
    paymentInstructions: p.paymentInstructions,
    invoiceFooter: p.invoiceFooter,
    logoUrl: p.logoUrl || resolveDefaultCompanyLogoDataUri(),
    stampUrl: p.stampUrl,
    signatureUrl: p.signatureUrl,
    combinedStampSignatureUrl: p.combinedStampSignatureUrl,
  };
};

/**
 * Merge only provided keys into an existing profile.
 * Empty strings clear optional asset / instruction fields; legal IDs fall back to official defaults when blank.
 */
export const applyCompanyProfilePatch = (current = {}, patch = {}) => {
  const base = normalizeCompanyProfile(current);
  const next = { ...base };

  const assignable = [
    'name',
    'addressLine1',
    'addressLine2',
    'address',
    'phone',
    'email',
    'ice',
    'if',
    'rc',
    'accentColor',
    'paymentInstructions',
    'invoiceFooter',
    'logoUrl',
    'stampUrl',
    'signatureUrl',
    'combinedStampSignatureUrl',
  ];

  for (const key of assignable) {
    if (patch[key] === undefined) continue;
    next[key] = String(patch[key] ?? '').trim();
  }

  if (!next.address && (next.addressLine1 || next.addressLine2)) {
    next.address = [next.addressLine1, next.addressLine2].filter(Boolean).join(', ');
  }

  return normalizeCompanyProfile(next);
};

/** Prefer combined stamp+signature, else stamp, else signature. */
export const resolveCompanyStampAssetUrl = (profile) => {
  const p = normalizeCompanyProfile(profile);
  return p.combinedStampSignatureUrl || p.stampUrl || p.signatureUrl || '';
};

export default {
  OFFICIAL_COMPANY_PROFILE,
  resolveDefaultCompanyLogoDataUri,
  normalizeCompanyProfile,
  companyProfileToAgency,
  applyCompanyProfilePatch,
  resolveCompanyStampAssetUrl,
};
