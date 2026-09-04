import Booking from "../models/Booking.js";
import Contract from "../models/Contract.js";
import User from "../models/User.js";
import {
  findBookingByCompletionToken,
  initiateBookingCompletion,
  ensureBookingCompletionLink,
  cancelSignatureRequest,
  listSignatureRequests,
  getSignatureRequestSummary,
  markCompletionPayment,
  refreshCompletionFlags,
  renderContractPreviewHtml,
  resolveCompletionMode,
  saveSignatureAndMaybeFinalize,
  tryFinalizeBookingCompletion,
} from "../services/bookingCompletionService.js";
import { storeDocumentImage } from "../services/documentStore.js";
import {
  computePayableAmount,
  createStripeCheckoutSession,
  getDepositPercent,
  getPaymentMode,
  retrieveStripeSession,
} from "../services/paymentService.js";
import { cleanupUploadedFile } from "../middleware/multer.js";
import {
  appendSignedQuery,
  buildSignedContractShareUrl,
  verifySignedContractShare,
} from "../middleware/uploadAccess.js";
import { hydrateContractIfNeeded } from "./contractController.js";
import { BRAND_NAME } from "../utils/brand.js";
import {
  buildSignedContractToCustomerWhatsAppUrl,
  buildSignatureLinkToCustomerWhatsAppUrl,
} from "../services/whatsappNotify.js";
import {
  applyCompletionDetailsToBooking,
  validateCompletionDetails,
} from "../utils/applyCompletionDetails.js";

const signIfLocalUpload = (url) => {
  if (!url || typeof url !== "string") return url || "";
  if (
    url.includes("/uploads/documents")
    || url.includes("/uploads/contracts")
    || url.includes("/uploads/templates")
  ) {
    return appendSignedQuery(url);
  }
  return url;
};

const MONGO_ID_RE = /^[a-fA-F0-9]{24}$/;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const sendShareHtml = (res, status, message) => {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.send(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HDN Car</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;max-width:36rem;line-height:1.5;color:#1a1a1a"><p>${escapeHtml(message)}</p></body></html>`,
  );
};

const allowPdfFraming = (res) => {
  const origins = (process.env.CLIENT_URL || "https://hdncar.com,https://www.hdncar.com,http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", `frame-ancestors 'self' ${origins.join(" ")}`);
};

const safePublicError = (error, fallback) => {
  if (
    error?.code === "TOKEN_EXPIRED"
    || error?.code === "TOKEN_CANCELLED"
    || error?.code === "VALIDATION"
  ) {
    return error.message || fallback;
  }
  return fallback;
};

/**
 * A signature-only link exposes the reservation read-only. Anything that would let
 * the holder of the link rewrite the booking is refused rather than ignored, so a
 * tampered client gets a clear error instead of a silent no-op.
 */
const rejectIfSignatureOnly = (booking, res) => {
  if (resolveCompletionMode(booking) !== "signature_only") return false;
  res.status(403).json({
    success: false,
    code: "SIGNATURE_ONLY",
    message: "This link is for signing only. Contact the agency to change reservation details.",
  });
  return true;
};

const publicBookingView = (booking) => {
  const c = booking.completion || {};
  const flags = {
    documentsComplete: Boolean(c.documentsComplete),
    paymentComplete: Boolean(c.paymentComplete),
    signatureComplete: Boolean(c.signatureComplete),
  };
  return {
    reservationId: booking.reservationId,
    status: booking.status,
    mode: resolveCompletionMode(booking),
    requestStatus: c.requestStatus || (flags.signatureComplete ? "signed" : "pending"),
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress || "",
    placeOfBirth: booking.placeOfBirth || "",
    identityDocumentNumber: booking.identityDocumentNumber || "",
    identityIssuedOn: booking.identityIssuedOn || "",
    identityExpiresOn: booking.identityExpiresOn || "",
    driverLicenseIssuedOn: booking.driverLicenseIssuedOn || "",
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    pickupLocation: booking.pickupLocation,
    returnLocation: booking.returnLocation,
    price: booking.price,
    priceBreakdown: booking.priceBreakdown,
    paymentStatus: booking.paymentStatus,
    dateOfBirth: booking.dateOfBirth || "",
    nationality: booking.nationality || "",
    driverLicenseNumber: booking.driverLicenseNumber || "",
    driverLicenseExpiry: booking.driverLicenseExpiry || "",
    passportNumber: booking.passportNumber || "",
    secondDriver: booking.secondDriver || {
      enabled: false,
      fullName: "",
      dateOfBirth: "",
      nationality: "",
      driverLicenseNumber: "",
      driverLicenseExpiry: "",
      passportNumber: "",
      phone: "",
    },
    car: booking.car
      ? {
          brand: booking.car.brand,
          model: booking.car.model,
          year: booking.car.year,
          image: booking.car.image,
          category: booking.car.category,
        }
      : null,
    completion: {
      drivingLicenseUrl: signIfLocalUpload(c.drivingLicenseUrl || ""),
      identityType: c.identityType || "",
      identityDocumentUrl: signIfLocalUpload(c.identityDocumentUrl || ""),
      signatureUrl: c.signatureUrl ? "on_file" : "",
      secondDriverSignatureUrl: c.secondDriverSignatureUrl ? "on_file" : "",
      paymentType: c.paymentType || "",
      amountPaid: c.amountPaid || 0,
      amountDue: c.amountDue || 0,
      contractPdfUrl: flags.signatureComplete && booking._id
        ? buildSignedContractShareUrl(booking._id)
        : signIfLocalUpload(c.contractPdfUrl || ""),
      invoicePdfUrl: signIfLocalUpload(c.invoicePdfUrl || ""),
      completedAt: c.completedAt || null,
      documentsComplete: flags.documentsComplete,
      paymentComplete: flags.paymentComplete,
      signatureComplete: flags.signatureComplete,
      depositPercent: getDepositPercent(),
      depositAmount: computePayableAmount(booking.price, "deposit"),
      fullAmount: computePayableAmount(booking.price, "full"),
      paymentMode: getPaymentMode(),
      expiresAt: c.tokenExpiresAt,
    },
  };
};

export const getCompletionBooking = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    refreshCompletionFlags(booking);
    await booking.save();
    res.json({ success: true, booking: publicBookingView(booking) });
  } catch (error) {
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

/** Read-only render of the contract the customer is about to sign. */
export const getCompletionContractPreview = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const { html, contractNumber, source } = await renderContractPreviewHtml(booking._id);
    res.json({ success: true, html, contractNumber, source });
  } catch (error) {
    console.error("[contract-preview]", error.message);
    const status = error.code === "TOKEN_EXPIRED" ? 410 : error.code === "VALIDATION" ? 400 : 500;
    res.status(status).json({
      success: false,
      message: safePublicError(error, "Could not load the contract. Please contact the agency."),
    });
  }
};

export const uploadCompletionDocument = async (req, res) => {
  let file = req.file;
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (rejectIfSignatureOnly(booking, res)) return;
    if (booking.status === "ready_for_pickup") {
      return res.status(400).json({ success: false, message: "This reservation is already complete" });
    }

    const docType = req.body.docType; // driving_license | identity
    const identityType = req.body.identityType; // national_id | passport

    if (!file) {
      return res.status(400).json({ success: false, message: "Please upload an image file" });
    }
    if (!["driving_license", "identity"].includes(docType)) {
      return res.status(400).json({ success: false, message: "Invalid document type" });
    }

    const url = await storeDocumentImage(file, `/booking-docs/${booking.reservationId}`);
    file = null;

    booking.completion = booking.completion || {};
    if (docType === "driving_license") {
      booking.completion.drivingLicenseUrl = url;
    } else {
      if (!["national_id", "passport"].includes(identityType)) {
        return res.status(400).json({ success: false, message: "Select National ID or Passport" });
      }
      booking.completion.identityType = identityType;
      booking.completion.identityDocumentUrl = url;
    }

    refreshCompletionFlags(booking);
    const { syncCompletionDocumentsToArchive } = await import('../services/customerDocuments.js');
    syncCompletionDocumentsToArchive(booking);
    await booking.save();
    await tryFinalizeBookingCompletion(booking._id);
    const fresh = await Booking.findById(booking._id).populate("car");

    res.json({
      success: true,
      message: "Document uploaded",
      booking: publicBookingView(fresh),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === "TOKEN_EXPIRED" ? 410 : 500;
    res.status(status).json({
      success: false,
      message: safePublicError(error, "Upload failed"),
    });
  } finally {
    cleanupUploadedFile(file);
  }
};

export const saveCompletionDetails = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (rejectIfSignatureOnly(booking, res)) return;
    if (booking.status === "ready_for_pickup") {
      return res.status(400).json({ success: false, message: "This reservation is already complete" });
    }

    applyCompletionDetailsToBooking(booking, req.body, { scope: 'customer' });
    refreshCompletionFlags(booking);
    await booking.save();
    const fresh = await Booking.findById(booking._id).populate('car');

    res.json({
      success: true,
      message: 'Contract details saved',
      booking: publicBookingView(fresh),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === 'TOKEN_EXPIRED' ? 410 : error.code === 'VALIDATION' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: safePublicError(error, 'Failed to save contract details'),
    });
  }
};

export const createCompletionPayment = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (booking.status === "ready_for_pickup" || booking.completion?.completedAt) {
      return res.status(400).json({
        success: false,
        message: "This reservation is already complete",
      });
    }
    if (booking.completion?.paymentComplete) {
      return res.json({ success: true, alreadyPaid: true, booking: publicBookingView(booking) });
    }

    const paymentType = req.body.paymentType === "deposit" ? "deposit" : "full";
    const amount = computePayableAmount(booking.price, paymentType);
    const mode = getPaymentMode();
    const clientBase = (process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
    const token = req.params.token;

    booking.completion = booking.completion || {};
    booking.completion.paymentType = paymentType;
    booking.completion.amountDue = amount;
    await booking.save();

    if (mode === "stripe") {
      const session = await createStripeCheckoutSession({
        booking,
        paymentType,
        amount,
        successUrl: `${clientBase}/complete-booking/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${clientBase}/complete-booking/${token}?cancelled=1`,
      });
      booking.completion.stripeSessionId = session.id;
      await booking.save();
      return res.json({
        success: true,
        mode: "stripe",
        checkoutUrl: session.url,
        amount,
        paymentType,
      });
    }

    if (mode === "disabled") {
      return res.status(503).json({
        success: false,
        message: "Online payments are not configured. Contact the agency.",
      });
    }

    // Demo / sandbox payment — local/staging only (blocked in production without ALLOW_DEMO_PAYMENT)
    return res.json({
      success: true,
      mode: "demo",
      amount,
      paymentType,
      message: "Demo payment ready — confirm to simulate a successful charge",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Payment init failed" });
  }
};

export const confirmDemoPayment = async (req, res) => {
  try {
    const mode = getPaymentMode();
    if (mode === "stripe" || mode === "disabled") {
      return res.status(400).json({
        success: false,
        message: "Demo payment is disabled in this environment",
      });
    }
    if (String(process.env.ALLOW_DEMO_PAYMENT || "").toLowerCase() !== "true" && process.env.NODE_ENV === "production") {
      return res.status(400).json({ success: false, message: "Demo payment disabled" });
    }

    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const paymentType = req.body.paymentType === "deposit" ? "deposit" : "full";
    const amount = computePayableAmount(booking.price, paymentType);
    const result = await markCompletionPayment(booking, { paymentType, amount });

    res.json({
      success: true,
      message: "Payment recorded",
      finalized: result.finalized,
      booking: publicBookingView(result.booking),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
};

export const confirmStripePayment = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }

    const sessionId = req.body.sessionId || req.query.session_id;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing Stripe session" });
    }

    const session = await retrieveStripeSession(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed yet" });
    }

    const metaBookingId = session.metadata?.bookingId || session.client_reference_id;
    if (!metaBookingId || metaBookingId !== booking._id.toString()) {
      return res.status(400).json({ success: false, message: "Session mismatch" });
    }

    const expectedAmount = computePayableAmount(
      booking.price,
      session.metadata?.paymentType === "deposit" ? "deposit" : "full"
    );
    const paidAmount = (session.amount_total || 0) / 100;
    // Allow 1 minor-unit tolerance for currency rounding
    if (Math.abs(paidAmount - expectedAmount) > 0.02) {
      return res.status(400).json({ success: false, message: "Paid amount does not match booking" });
    }

    const paymentType = session.metadata?.paymentType === "deposit" ? "deposit" : "full";
    const amount = paidAmount;
    const result = await markCompletionPayment(booking, {
      paymentType,
      amount,
      stripeSessionId: sessionId,
    });

    res.json({
      success: true,
      message: "Payment confirmed",
      finalized: result.finalized,
      booking: publicBookingView(result.booking),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Stripe confirmation failed" });
  }
};

export const submitCompletionSignature = async (req, res) => {
  try {
    const booking = await findBookingByCompletionToken(req.params.token);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Invalid or expired completion link" });
    }
    if (booking.status === "ready_for_pickup" || booking.completion?.completedAt) {
      return res.status(400).json({
        success: false,
        message: "This reservation is already complete and can no longer be changed",
      });
    }

    const { signatureDataUrl, secondDriverSignatureDataUrl, agreed, ...detailsPayload } = req.body;
    if (!agreed) {
      return res.status(400).json({ success: false, message: "You must agree to the rental terms" });
    }
    if (!signatureDataUrl || !String(signatureDataUrl).startsWith("data:image")) {
      return res.status(400).json({ success: false, message: "Please provide your signature" });
    }

    const signatureOnly = resolveCompletionMode(booking) === "signature_only";

    // On a signature-only link the reservation belongs to the agency, so anything the
    // client sends alongside the signature is discarded rather than written. This is
    // the guarantee that a signer can never alter the booking they are signing for.
    //
    // The completeness gate is skipped with it: a desk booking may legitimately have
    // blank identity fields (the walk-in form treats them as optional) and the signer
    // has no way to fill them, so enforcing it here would only produce a dead end.
    // Blank values render as "—" on the contract.
    if (!signatureOnly) {
      const hasDetailFields = [
        'customerName',
        'customerEmail',
        'customerPhone',
        'dateOfBirth',
        'nationality',
        'customerAddress',
        'placeOfBirth',
        'identityDocumentNumber',
        'identityIssuedOn',
        'identityExpiresOn',
        'driverLicenseNumber',
        'driverLicenseExpiry',
        'driverLicenseIssuedOn',
        'passportNumber',
        'secondDriver',
      ].some((k) => detailsPayload[k] !== undefined);

      if (hasDetailFields) {
        applyCompletionDetailsToBooking(booking, detailsPayload, { scope: 'customer' });
      }
      validateCompletionDetails(booking);
    }

    // A contract still needs someone to name, on every path.
    if (!String(booking.customerName || '').trim()) {
      return res.status(400).json({ success: false, message: "This reservation has no customer name" });
    }

    await booking.save();

    refreshCompletionFlags(booking);
    if (!signatureOnly && !booking.completion.documentsComplete) {
      return res.status(400).json({ success: false, message: "Upload required documents first" });
    }

    // A second driver on the reservation must sign on every link type, including
    // signature-only. The locked page still cannot edit second-driver details —
    // only their signature is collected and stored against this booking.
    if (booking.secondDriver?.enabled) {
      if (!secondDriverSignatureDataUrl || !String(secondDriverSignatureDataUrl).startsWith("data:image")) {
        return res.status(400).json({ success: false, message: "Please provide the second driver signature" });
      }
    }

    const result = await saveSignatureAndMaybeFinalize(booking, {
      signatureDataUrl,
      secondDriverSignatureDataUrl: booking.secondDriver?.enabled
        ? secondDriverSignatureDataUrl
        : undefined,
    });
    res.json({
      success: true,
      message: result.finalized
        ? "Signed — your reservation is ready for pickup"
        : result.awaitingPayment
          ? "Signature saved — complete payment to finish"
          : "Signature saved",
      finalized: result.finalized,
      awaitingPayment: Boolean(result.awaitingPayment),
      booking: publicBookingView(result.booking),
    });
  } catch (error) {
    console.error(error.message);
    const status = error.code === 'VALIDATION' ? 400 : 500;
    res.status(status).json({
      success: false,
      message: safePublicError(error, "Signature failed. Please try again or contact the agency."),
    });
  }
};

/** Owner: ensure a valid completion link exists (no WhatsApp / Meta API). */
export const ensureCompletionLink = async (req, res) => {
  try {
    const { bookingId, refresh } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await ensureBookingCompletionLink(bookingId, { refresh: Boolean(refresh) });
    const lang = req.body?.lang;

    let whatsappConfirmationUrl = null;
    let customerDial = null;
    let whatsappCode = null;
    try {
      const populated = await Booking.findById(bookingId).populate("car", "brand model licensePlate").lean();
      const share = buildSignatureLinkToCustomerWhatsAppUrl({
        language: lang,
        brand: BRAND_NAME,
        customerName: populated?.customerName || booking.customerName,
        customerPhone: populated?.customerPhone || booking.customerPhone,
        reservationId: populated?.reservationId || booking.reservationId,
        car: populated?.car,
        pickupDate: populated?.pickupDate || booking.pickupDate,
        returnDate: populated?.returnDate || booking.returnDate,
        completionUrl: result.completionUrl,
        signatureOnly: resolveCompletionMode(populated || booking) === "signature_only",
        secondDriver: populated?.secondDriver || booking.secondDriver,
      });
      if (share.ok) {
        whatsappConfirmationUrl = share.whatsappUrl;
        customerDial = share.customerDial;
      } else {
        whatsappCode = share.code;
      }
    } catch (waError) {
      console.error("[ensureCompletionLink] WhatsApp URL", waError.message);
    }

    res.status(200).json({
      success: true,
      completionUrl: result.completionUrl,
      shareableCompletionUrl: result.completionUrl,
      created: result.created,
      status: result.booking.status,
      requestStatus: result.requestStatus || getSignatureRequestSummary(result.booking).requestStatus,
      signatureRequest: getSignatureRequestSummary(result.booking),
      ...(whatsappConfirmationUrl ? { whatsappConfirmationUrl, whatsappUrl: whatsappConfirmationUrl } : {}),
      ...(customerDial ? { customerDial } : {}),
      ...(whatsappCode ? { whatsappCode } : {}),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to ensure completion link" });
  }
};

/** Owner: secure signed-contract URL + WhatsApp message to the customer. */
export const shareSignedContract = async (req, res) => {
  try {
    const { bookingId, lang } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    const booking = await Booking.findOne({ _id: bookingId, owner: req.user._id })
      .populate("car", "brand model licensePlate")
      .lean();
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const signed = Boolean(booking.completion?.signatureComplete)
      || booking.completion?.requestStatus === "signed";
    if (!signed) {
      return res.status(409).json({
        success: false,
        code: "NOT_SIGNED",
        message: "The contract must be fully signed before it can be shared.",
      });
    }

    const contract = await Contract.findOne({ owner: req.user._id, booking: booking._id })
      .sort({ updatedAt: -1 })
      .select("_id")
      .lean();
    if (!contract) {
      return res.status(409).json({
        success: false,
        code: "NO_PDF",
        message: "The signed contract PDF is not available yet.",
      });
    }

    const signedContractUrl = buildSignedContractShareUrl(booking._id);
    const share = buildSignedContractToCustomerWhatsAppUrl({
      language: lang,
      brand: BRAND_NAME,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      reservationId: booking.reservationId,
      car: booking.car,
      pickupDate: booking.pickupDate,
      returnDate: booking.returnDate,
      signedContractUrl,
    });

    if (!share.ok) {
      return res.status(400).json({
        success: false,
        code: share.code || "NO_PHONE",
        message: "Add the customer’s phone number to share the contract on WhatsApp.",
        signedContractUrl,
      });
    }

    res.json({
      success: true,
      signedContractUrl,
      whatsappUrl: share.whatsappUrl,
      customerDial: share.customerDial,
      message: share.message,
    });
  } catch (error) {
    console.error("[shareSignedContract]", error.message);
    res.status(500).json({ success: false, message: "Could not prepare the signed contract for WhatsApp." });
  }
};

/** Public: stream (and regenerate if needed) a signed contract PDF. */
export const streamSignedContractPdf = async (req, res) => {
  try {
    const bookingId = String(req.params.bookingId || "").replace(/\.pdf$/i, "");
    if (!MONGO_ID_RE.test(bookingId) || !verifySignedContractShare(bookingId, req.query.exp, req.query.sig)) {
      return sendShareHtml(
        res,
        403,
        "This signed contract link is invalid or has expired. Please contact HDN Car.",
      );
    }

    const booking = await Booking.findById(bookingId).select("owner completion").lean();
    if (!booking) {
      return sendShareHtml(
        res,
        404,
        "This signed contract link is no longer available. Please contact HDN Car.",
      );
    }

    const signed = Boolean(booking.completion?.signatureComplete)
      || booking.completion?.requestStatus === "signed";
    if (!signed) {
      return sendShareHtml(
        res,
        404,
        "The signed contract is not available yet. Please contact HDN Car.",
      );
    }

    const contract = await Contract.findOne({ owner: booking.owner, booking: booking._id })
      .sort({ updatedAt: -1 })
      .lean();
    if (!contract) {
      return sendShareHtml(
        res,
        404,
        "The signed contract is not available yet. Please contact HDN Car.",
      );
    }

    const owner = await User.findById(booking.owner);
    if (!owner) {
      return sendShareHtml(
        res,
        404,
        "The signed contract is not available yet. Please contact HDN Car.",
      );
    }

    const { ensureSignedContractPdfFile } = await import("../utils/ensureDocumentPdf.js");
    const { filePath } = await ensureSignedContractPdfFile({
      document: contract,
      owner,
      Model: Contract,
      hydrate: hydrateContractIfNeeded,
    });

    const safeName = String(contract.contractNumber || "contract").replace(/[^\w.-]+/g, "_");
    allowPdfFraming(res);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}-signed.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(filePath);
  } catch (error) {
    console.error("[streamSignedContractPdf]", error.message);
    return sendShareHtml(
      res,
      500,
      "The signed contract is temporarily unavailable. Please contact HDN Car.",
    );
  }
};

/** Owner: cancel active signature / completion link */
export const cancelCompletionLink = async (req, res) => {
  try {
    const { bookingId, reason } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }
    const booking = await Booking.findById(bookingId).select("owner");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await cancelSignatureRequest(bookingId, {
      reason,
      actorId: req.user._id,
    });
    res.json({
      success: true,
      message: "Signature request cancelled",
      requestStatus: result.requestStatus,
      signatureRequest: result.summary,
    });
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error(error.message);
    res.status(status).json({
      success: false,
      message: status < 500 ? error.message : "Failed to cancel signature request",
    });
  }
};

/** Owner: signature-request inbox */
export const listOwnerSignatureRequests = async (req, res) => {
  try {
    const result = await listSignatureRequests(req.user._id, req.query);
    res.json({
      success: true,
      requests: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Failed to list signature requests" });
  }
};

/** Owner: resend secure completion link */
export const resendCompletionLink = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (booking.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const result = await initiateBookingCompletion(bookingId, { resend: true });
    const emailOk = Boolean(result.emailResult?.success);
    res.status(200).json({
      success: true,
      emailSent: emailOk,
      message: emailOk
        ? `Completion email accepted by SMTP for ${result.emailResult.to}`
        : `Completion link refreshed. Email NOT delivered: ${result.emailResult?.reason || "unknown error"}`,
      completionUrl: result.completionUrl,
      email: result.emailResult,
      requestStatus: result.requestStatus,
      signatureRequest: getSignatureRequestSummary(result.booking),
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to send link" });
  }
};

export const emailDiagnostics = async (req, res) => {
  try {
    const { verifyEmailTransport, getSmtpConfigSummary } = await import("../services/emailService.js");
    const result = await verifyEmailTransport();
    res.json({
      success: result.success,
      diagnostics: result,
      summary: getSmtpConfigSummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { sendEmail, getSmtpConfigSummary } = await import("../services/emailService.js");
    const to = (req.body?.to || req.user?.email || "").trim();
    if (!to) {
      return res.status(400).json({ success: false, message: "Provide { to: 'email@example.com' }" });
    }
    const result = await sendEmail({
      to,
      subject: "HDN Car — SMTP test",
      html: `<p>This is a test email from HDN Car.</p><p>If you received this, SMTP delivery is working.</p><p>${new Date().toISOString()}</p>`,
    });
    res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success
        ? `Test email accepted by SMTP for ${result.to}`
        : `Test email FAILED: ${result.reason}`,
      email: result,
      smtp: getSmtpConfigSummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminInitiateCompletion = initiateBookingCompletion;

export default {
  getCompletionBooking,
  getCompletionContractPreview,
  uploadCompletionDocument,
  createCompletionPayment,
  confirmDemoPayment,
  confirmStripePayment,
  submitCompletionSignature,
  resendCompletionLink,
  ensureCompletionLink,
  shareSignedContract,
  streamSignedContractPdf,
  cancelCompletionLink,
  listOwnerSignatureRequests,
  emailDiagnostics,
  sendTestEmail,
};
