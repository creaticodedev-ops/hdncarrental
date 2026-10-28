import {
  getOrCreateAgencySettings,
  serializeAgencySettings,
  updateWhatsAppSettings,
  updateCompanyProfile,
} from '../services/agencySettingsService.js';
import { updateBookingSettings } from '../services/bookingSettingsService.js';
import { logAudit } from '../utils/adminOps.js';
import { cleanupUploadedFile } from '../middleware/multer.js';
import {
  persistDurableCompanyAsset,
  clearLocalCompanyAsset,
} from '../utils/templateAssets.js';

const ASSET_FIELD_BY_KIND = {
  logo: 'logoUrl',
  stamp: 'stampUrl',
  signature: 'signatureUrl',
  combined: 'combinedStampSignatureUrl',
};

export const getAgencySettings = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await getOrCreateAgencySettings(ownerId);
    res.json({
      success: true,
      settings: await serializeAgencySettings(ownerId, doc),
    });
  } catch (error) {
    console.error('[getAgencySettings]', error.message);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

export const updateAgencySettings = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const body = req.body || {};
    let bookingUpdated = null;

    if (
      body.whatsappReservationNumber !== undefined ||
      body.whatsappConfirmationNumber !== undefined
    ) {
      await updateWhatsAppSettings(ownerId, {
        whatsappReservationNumber: body.whatsappReservationNumber,
        whatsappConfirmationNumber: body.whatsappConfirmationNumber,
      });
    }

    if (body.bookingSettings && typeof body.bookingSettings === 'object') {
      // updateBookingSettings re-reads Mongo and throws if nothing persisted.
      bookingUpdated = await updateBookingSettings(ownerId, body.bookingSettings);
    }

    if (body.companyProfile && typeof body.companyProfile === 'object') {
      await updateCompanyProfile(ownerId, body.companyProfile);
    }

    // Fresh load after writes — never serialize a pre-update in-memory doc.
    const doc = await getOrCreateAgencySettings(ownerId);
    const settings = await serializeAgencySettings(ownerId, doc);

    if (bookingUpdated) {
      // Defense in depth: response must echo the persisted booking rules.
      const returned = settings.bookingSettings || {};
      for (const [key, value] of Object.entries(bookingUpdated)) {
        if (returned[key] !== value) {
          return res.status(500).json({
            success: false,
            message: `Settings save did not persist (${key})`,
          });
        }
      }
    }

    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'settings.update',
        entityType: 'AgencySettings',
        entityId: doc._id,
        details: body.companyProfile
          ? 'Updated company branding settings'
          : bookingUpdated
            ? 'Updated agency booking settings'
            : 'Updated agency settings',
      });
    } catch (auditError) {
      console.error('[updateAgencySettings] audit', auditError.message);
    }

    res.json({
      success: true,
      message: 'Settings saved',
      settings,
    });
  } catch (error) {
    console.error('[updateAgencySettings]', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to save settings' });
  }
};

export const uploadCompanyAsset = async (req, res) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    const field = ASSET_FIELD_BY_KIND[kind];
    if (!field) {
      cleanupUploadedFile(req.file);
      return res.status(400).json({ success: false, message: 'Invalid asset kind' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const ownerId = req.user._id;
    const stored = await persistDurableCompanyAsset(ownerId, req.file, kind);
    const companyProfile = await updateCompanyProfile(ownerId, { [field]: stored.url });

    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'settings.company_asset_upload',
        entityType: 'AgencySettings',
        details: `Uploaded company ${kind}`,
      });
    } catch {
      /* non-fatal */
    }

    res.json({
      success: true,
      message: 'Asset uploaded',
      kind,
      url: stored.url,
      storage: stored.storage,
      companyProfile,
    });
  } catch (error) {
    cleanupUploadedFile(req.file);
    console.error('[uploadCompanyAsset]', error?.code || '', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload asset' });
  }
};

export const clearCompanyAsset = async (req, res) => {
  try {
    const kind = String(req.params.kind || '').toLowerCase();
    const field = ASSET_FIELD_BY_KIND[kind];
    if (!field) {
      return res.status(400).json({ success: false, message: 'Invalid asset kind' });
    }

    const ownerId = req.user._id;
    clearLocalCompanyAsset(ownerId, kind);
    const companyProfile = await updateCompanyProfile(ownerId, { [field]: '' });

    res.json({
      success: true,
      message: 'Asset removed',
      kind,
      companyProfile,
    });
  } catch (error) {
    console.error('[clearCompanyAsset]', error.message);
    res.status(500).json({ success: false, message: 'Failed to remove asset' });
  }
};

export default {
  getAgencySettings,
  updateAgencySettings,
  uploadCompanyAsset,
  clearCompanyAsset,
};
