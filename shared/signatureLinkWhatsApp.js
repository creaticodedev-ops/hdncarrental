/**
 * WhatsApp copy for the owner → customer signature / completion link.
 * Shared by client and server so the customer always receives the same message.
 *
 * WhatsApp markup: *bold*
 */

const interpolate = (template, vars) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (
    vars[key] == null || vars[key] === '' ? '—' : String(vars[key])
  ));

const SIGNATURE_ONLY = {
  en: `Hello {{name}},

Thank you for choosing *{{brand}}*.

Please review and sign your rental contract using the secure link below:

🔗 {{link}}

Reservation: {{reservationId}}
Vehicle: {{vehicle}}
Rental period: {{pickup}} → {{returnDate}}

Kind regards,
*The {{brand}} Team*`,

  fr: `Bonjour {{name}},

Merci d’avoir choisi *{{brand}}*.

Merci de relire et de signer votre contrat de location via le lien sécurisé ci-dessous :

🔗 {{link}}

Réservation : {{reservationId}}
Véhicule : {{vehicle}}
Période de location : {{pickup}} → {{returnDate}}

Cordialement,
*L’équipe {{brand}}*`,

  es: `Hola {{name}},

Gracias por elegir *{{brand}}*.

Por favor, revise y firme su contrato de alquiler a través del enlace seguro siguiente:

🔗 {{link}}

Reserva: {{reservationId}}
Vehículo: {{vehicle}}
Periodo de alquiler: {{pickup}} → {{returnDate}}

Atentamente,
*El equipo {{brand}}*`,
};

const FULL = {
  en: `Hello {{name}},

Thank you for choosing *{{brand}}*. Your reservation is confirmed.

Please complete your booking (documents and signature) using the secure link below:

🔗 {{link}}

Reservation: {{reservationId}}
Vehicle: {{vehicle}}
Rental period: {{pickup}} → {{returnDate}}

Kind regards,
*The {{brand}} Team*`,

  fr: `Bonjour {{name}},

Merci d’avoir choisi *{{brand}}*. Votre réservation est confirmée.

Merci de finaliser votre dossier (documents et signature) via le lien sécurisé ci-dessous :

🔗 {{link}}

Réservation : {{reservationId}}
Véhicule : {{vehicle}}
Période de location : {{pickup}} → {{returnDate}}

Cordialement,
*L’équipe {{brand}}*`,

  es: `Hola {{name}},

Gracias por elegir *{{brand}}*. Su reserva está confirmada.

Por favor, complete su reserva (documentos y firma) a través del enlace seguro siguiente:

🔗 {{link}}

Reserva: {{reservationId}}
Vehículo: {{vehicle}}
Periodo de alquiler: {{pickup}} → {{returnDate}}

Atentamente,
*El equipo {{brand}}*`,
};

export const normalizeShareLanguage = (language) => {
  const lang = String(language || '').slice(0, 2).toLowerCase();
  return SIGNATURE_ONLY[lang] ? lang : 'en';
};

const SECOND_DRIVER_LINE = {
  en: 'Second driver: {{secondDriverName}}',
  fr: 'Deuxième conducteur : {{secondDriverName}}',
  es: 'Segundo conductor: {{secondDriverName}}',
};

const RESERVATION_LINE = {
  en: 'Reservation: {{reservationId}}',
  fr: 'Réservation : {{reservationId}}',
  es: 'Reserva: {{reservationId}}',
};

export const secondDriverShareName = (secondDriver) => {
  if (!secondDriver?.enabled) return '';
  return String(secondDriver.fullName || '').trim();
};

export const buildSignatureLinkWhatsAppMessage = ({
  language = 'en',
  brand = 'HDN Car',
  name = '',
  reservationId = '',
  vehicle = '',
  pickup = '',
  returnDate = '',
  link = '',
  signatureOnly = false,
  secondDriverName = '',
  secondDriver,
} = {}) => {
  const lang = normalizeShareLanguage(language);
  const template = (signatureOnly ? SIGNATURE_ONLY : FULL)[lang];
  const id = reservationId || '—';
  let text = interpolate(template, {
    brand,
    name: name || '—',
    reservationId: id,
    vehicle: vehicle || '—',
    pickup: pickup || '—',
    returnDate: returnDate || '—',
    link: link || '—',
  }).trim();
  const sdName = String(secondDriverName || secondDriverShareName(secondDriver) || '').trim();
  if (sdName) {
    const reservationLine = interpolate(RESERVATION_LINE[lang], { reservationId: id });
    const extra = interpolate(SECOND_DRIVER_LINE[lang], { secondDriverName: sdName });
    if (text.includes(reservationLine)) {
      text = text.replace(reservationLine, `${reservationLine}\n${extra}`);
    } else {
      text = `${text}\n${extra}`;
    }
  }
  return text;
};

export default buildSignatureLinkWhatsAppMessage;
