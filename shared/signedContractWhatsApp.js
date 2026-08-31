/**
 * WhatsApp copy for a fully signed rental contract.
 * Shared by client and server so the customer always receives the same message.
 *
 * WhatsApp markup: *bold*
 */

const interpolate = (template, vars) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (
    vars[key] == null || vars[key] === '' ? '—' : String(vars[key])
  ));

const TEMPLATES = {
  en: `Hello {{name}},

Thank you for choosing *{{brand}}* and for trusting us with your rental.

Your rental agreement has been *successfully signed and finalized*. You can view and download your signed contract at any time using the secure link below:

🔗 {{link}}

Reservation: {{reservationId}}
Vehicle: {{vehicle}}
Rental period: {{pickup}} → {{returnDate}}

We wish you a pleasant journey and an excellent experience with your vehicle. Should you need any assistance, our team remains available to support you.

Thank you for choosing *{{brand}}*. We look forward to welcoming you again on your next rental. 🚗

Kind regards,
*The {{brand}} Team*`,

  fr: `Bonjour {{name}},

Merci d’avoir choisi *{{brand}}* et de nous faire confiance pour votre location.

Votre contrat de location a été *signé et finalisé avec succès*. Vous pouvez consulter et télécharger votre contrat signé à tout moment via le lien sécurisé ci-dessous :

🔗 {{link}}

Réservation : {{reservationId}}
Véhicule : {{vehicle}}
Période de location : {{pickup}} → {{returnDate}}

Nous vous souhaitons un excellent voyage et une belle expérience au volant. Notre équipe reste à votre disposition pour toute assistance.

Merci d’avoir choisi *{{brand}}*. Au plaisir de vous accueillir à nouveau pour votre prochaine location. 🚗

Cordialement,
*L’équipe {{brand}}*`,

  es: `Hola {{name}},

Gracias por elegir *{{brand}}* y por confiar en nosotros para su alquiler.

Su contrato de alquiler ha sido *firmado y finalizado con éxito*. Puede consultar y descargar su contrato firmado en cualquier momento a través del enlace seguro siguiente:

🔗 {{link}}

Reserva: {{reservationId}}
Vehículo: {{vehicle}}
Periodo de alquiler: {{pickup}} → {{returnDate}}

Le deseamos un buen viaje y una excelente experiencia con su vehículo. Si necesita cualquier ayuda, nuestro equipo permanece a su disposición.

Gracias por elegir *{{brand}}*. Esperamos volver a recibirle en su próximo alquiler. 🚗

Atentamente,
*El equipo {{brand}}*`,
};

export const normalizeShareLanguage = (language) => {
  const lang = String(language || '').slice(0, 2).toLowerCase();
  return TEMPLATES[lang] ? lang : 'en';
};

export const buildSignedContractWhatsAppMessage = ({
  language = 'en',
  brand = 'HDN Car',
  name = '',
  reservationId = '',
  vehicle = '',
  pickup = '',
  returnDate = '',
  link = '',
} = {}) => {
  const template = TEMPLATES[normalizeShareLanguage(language)];
  return interpolate(template, {
    brand,
    name: name || '—',
    reservationId: reservationId || '—',
    vehicle: vehicle || '—',
    pickup: pickup || '—',
    returnDate: returnDate || '—',
    link: link || '—',
  }).trim();
};

export default buildSignedContractWhatsAppMessage;
