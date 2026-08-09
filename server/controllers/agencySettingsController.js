import {
  getOrCreateAgencySettings,
  resolveWhatsAppDials,
  updateWhatsAppSettings,
} from '../services/agencySettingsService.js';
import { logAudit } from '../utils/adminOps.js';

const serialize = async (ownerId, doc) => {
  const dials = await resolveWhatsAppDials(ownerId);
  return {
    whatsappReservationNumber: doc?.whatsappReservationNumber || '',
    whatsappConfirmationNumber: doc?.whatsappConfirmationNumber || '',
    effective: {
      reservationDial: dials.reservationDial,
      confirmationDial: dials.confirmationDial,
    },
    updatedAt: doc?.updatedAt || null,
  };
};

export const getAgencySettings = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const doc = await getOrCreateAgencySettings(ownerId);
    res.json({
      success: true,
      settings: await serialize(ownerId, doc),
    });
  } catch (error) {
    console.error('[getAgencySettings]', error.message);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

export const updateAgencySettings = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { whatsappReservationNumber, whatsappConfirmationNumber } = req.body || {};

    const doc = await updateWhatsAppSettings(ownerId, {
      whatsappReservationNumber,
      whatsappConfirmationNumber,
    });

    try {
      await logAudit({
        owner: ownerId,
        actor: ownerId,
        action: 'settings.whatsapp.update',
        entityType: 'AgencySettings',
        entityId: doc._id,
        details: 'Updated WhatsApp reservation/confirmation numbers',
      });
    } catch (auditError) {
      console.error('[updateAgencySettings] audit', auditError.message);
    }

    res.json({
      success: true,
      message: 'WhatsApp settings saved',
      settings: await serialize(ownerId, doc),
    });
  } catch (error) {
    console.error('[updateAgencySettings]', error.message);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
};

export default { getAgencySettings, updateAgencySettings };
