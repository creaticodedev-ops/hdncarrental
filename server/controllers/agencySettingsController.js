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
      await updateBookingSettings(ownerId, body.bookingSettings);
    }

    const doc = await getOrCreateAgencySettings(ownerId);

    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'settings.update',
        entityType: 'AgencySettings',
        entityId: doc._id,
        details: 'Updated agency settings',
      });
    } catch (auditError) {
      console.error('[updateAgencySettings] audit', auditError.message);
    }

    res.json({
      success: true,
      message: 'Settings saved',
      settings: await serializeAgencySettings(ownerId, doc),
    });
  } catch (error) {
    console.error('[updateAgencySettings]', error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to save settings' });
  }
};

export default { getAgencySettings, updateAgencySettings };
