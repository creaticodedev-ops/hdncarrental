import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanupUploadedFile } from '../middleware/multer.js';
import { moveUploadedFile } from './fileMove.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ASSET_DIR = path.join(__dirname, '..', 'uploads', 'templates');
const MAX_INLINE_BYTES = 1.5 * 1024 * 1024;

const ensureTemplateAssetDir = () => {
  if (!fs.existsSync(TEMPLATE_ASSET_DIR)) fs.mkdirSync(TEMPLATE_ASSET_DIR, { recursive: true });
};

const mimeFromExt = (ext = '') => {
  const lower = String(ext).toLowerCase();
  if (lower === '.png') return 'image/png';
  if (lower === '.webp') return 'image/webp';
  if (lower === '.gif') return 'image/gif';
  if (lower === '.svg') return 'image/svg+xml';
  return 'image/jpeg';
};

/** Read a local image file as a data URI (for durable Mongo persistence). */
export const fileToDataUri = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_INLINE_BYTES) return null;
  const ext = path.extname(filePath);
  const buf = fs.readFileSync(filePath);
  return `data:${mimeFromExt(ext)};base64,${buf.toString('base64')}`;
};

/**
 * Persist a template logo/signature for production reliability:
 * 1) Prefer ImageKit CDN URL (survives deploys)
 * 2) Otherwise store a data URI in Mongo (survives ephemeral local disk)
 * Local files are still written when possible for admin preview convenience.
 */
export const persistDurableTemplateAsset = async (templateId, uploadedFile, kind) => {
  if (!uploadedFile?.path) throw new Error('No uploaded file');

  const hasImageKit =
    process.env.IMAGEKIT_PUBLIC_KEY &&
    process.env.IMAGEKIT_PRIVATE_KEY &&
    process.env.IMAGEKIT_URL_ENDPOINT;

  if (hasImageKit) {
    const { storeDocumentImage } = await import('../services/documentStore.js');
    const url = await storeDocumentImage(uploadedFile, `/export-templates/${kind}`);
    return { url, storage: 'imagekit' };
  }

  ensureTemplateAssetDir();
  const ext = path.extname(uploadedFile.originalname || '') || '.png';
  const safeExt = ext.includes('.') ? ext : '.png';
  const fileName = `${kind}-${templateId}${safeExt}`;
  const destPath = path.join(TEMPLATE_ASSET_DIR, fileName);
  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  moveUploadedFile(uploadedFile.path, destPath);

  const dataUri = fileToDataUri(destPath);
  if (dataUri) {
    return { url: dataUri, storage: 'data-uri', localPath: destPath };
  }

  // Oversized: keep local public URL (best effort without ImageKit)
  const base = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  return {
    url: `${base}/uploads/templates/${fileName}`,
    storage: 'local',
    localPath: destPath,
  };
};

export const clearLocalTemplateAsset = (templateId, kind) => {
  try {
    ensureTemplateAssetDir();
    for (const ext of ['.png', '.jpg', '.jpeg', '.webp', '.gif']) {
      const candidate = path.join(TEMPLATE_ASSET_DIR, `${kind}-${templateId}${ext}`);
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    }
  } catch (error) {
    console.warn('[templateAssets] clearLocalTemplateAsset:', error.message);
  }
};

export const cleanupFailedUpload = (file) => {
  try {
    cleanupUploadedFile(file);
  } catch {
    /* ignore */
  }
};

export default {
  persistDurableTemplateAsset,
  fileToDataUri,
  clearLocalTemplateAsset,
  cleanupFailedUpload,
};
