import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

const hmacSecret = () => process.env.JWT_SECRET || 'dev';

/**
 * Create a time-limited signature for a path under /uploads.
 * relPath example: "documents/RES-123/contract.pdf"
 */
export const signUploadAccess = (relPath, expiresInSec = 60 * 60 * 24 * 7) => {
  const normalized = String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/');
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const sig = crypto
    .createHmac('sha256', hmacSecret())
    .update(`${normalized}:${exp}`)
    .digest('hex');
  return { path: normalized, exp, sig };
};

export const verifyUploadAccess = (relPath, exp, sig) => {
  const normalized = String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/');
  const expNum = Number(exp);
  if (!normalized || !sig || !Number.isFinite(expNum)) return false;
  if (expNum < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto
    .createHmac('sha256', hmacSecret())
    .update(`${normalized}:${expNum}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)));
  } catch {
    return false;
  }
};

export const appendSignedQuery = (absoluteOrPublicUrl) => {
  if (!absoluteOrPublicUrl) return absoluteOrPublicUrl;
  try {
    const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
    const url = new URL(
      absoluteOrPublicUrl.startsWith('http')
        ? absoluteOrPublicUrl
        : `${base}${absoluteOrPublicUrl.startsWith('/') ? '' : '/'}${absoluteOrPublicUrl}`
    );
    const marker = '/uploads/';
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return absoluteOrPublicUrl;
    const rel = url.pathname.slice(idx + marker.length);
    const { exp, sig } = signUploadAccess(rel);
    url.searchParams.set('exp', String(exp));
    url.searchParams.set('sig', sig);
    return url.toString();
  } catch {
    return absoluteOrPublicUrl;
  }
};

/**
 * Protect /uploads/documents — requires signed query OR owner/superadmin JWT.
 * Other /uploads paths (if any) remain public.
 */
export const protectDocumentUploads = async (req, res, next) => {
  // Only gate the documents tree
  const rel = req.path.replace(/^\/+/, '');
  if (!rel.startsWith('documents')) {
    return next();
  }

  const { sig, exp } = req.query;
  if (verifyUploadAccess(rel, exp, sig)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded?._id || decoded).select('role accountStatus tokenVersion');
      if (
        user &&
        ['owner', 'superadmin'].includes(user.role) &&
        (!user.accountStatus || user.accountStatus === 'active')
      ) {
        const tv = decoded.tv ?? 0;
        if ((user.tokenVersion || 0) === tv) {
          return next();
        }
      }
    } catch {
      /* fall through */
    }
  }

  return res.status(401).json({ success: false, message: 'Document access denied' });
};

/** Safe send of a file under uploads (path traversal guard) */
export const resolveUploadFile = (relPath) => {
  const normalized = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const absolute = path.join(UPLOADS_ROOT, normalized);
  if (!absolute.startsWith(UPLOADS_ROOT)) return null;
  if (!fs.existsSync(absolute)) return null;
  return absolute;
};

export default {
  signUploadAccess,
  verifyUploadAccess,
  appendSignedQuery,
  protectDocumentUploads,
};
