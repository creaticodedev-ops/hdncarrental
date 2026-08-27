import {
  applyBookingExtension,
  listBookingExtensions,
  previewBookingExtension,
} from '../services/bookingExtensionService.js';

const sendError = (res, error, fallback) => {
  const status = error.status || 500;
  if (status >= 500) console.error('[extension]', error.message);
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : fallback,
    ...(error.code ? { code: error.code } : {}),
  });
};

export const previewExtension = async (req, res) => {
  try {
    const { bookingId, newReturnDate } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }
    const preview = await previewBookingExtension(req.user._id, bookingId, newReturnDate);
    res.json({ success: true, preview });
  } catch (error) {
    sendError(res, error, 'Failed to preview extension');
  }
};

export const applyExtension = async (req, res) => {
  try {
    const { bookingId, newReturnDate, notes } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }
    const result = await applyBookingExtension(req.user._id, bookingId, {
      newReturnDate,
      notes,
      actor: req.user,
    });
    res.json({
      success: true,
      message: 'Reservation extended',
      booking: result.booking,
      extension: result.extension,
      preview: result.preview,
      contract: result.contract,
      invoice: result.invoice,
    });
  } catch (error) {
    sendError(res, error, 'Failed to extend reservation');
  }
};

export const getExtensionHistory = async (req, res) => {
  try {
    const bookingId = req.params.bookingId || req.query.bookingId;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }
    const result = await listBookingExtensions(req.user._id, bookingId);
    res.json({ success: true, ...result });
  } catch (error) {
    sendError(res, error, 'Failed to load extension history');
  }
};
