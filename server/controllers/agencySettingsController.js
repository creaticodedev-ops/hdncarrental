import {
  getOrCreateAgencySettings,
  serializeAgencySettings,
  updateWhatsAppSettings,
} from '../services/agencySettingsService.js';
import { updateBookingSettings } from '../services/bookingSettingsService.js';
import { logAudit } from '../utils/adminOps.js';

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
        details: bookingUpdated
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

export default { getAgencySettings, updateAgencySettings };
