/**
 * Owner → customer WhatsApp templates for the Client workspace.
 * wa.me only — never sent by the server.
 *
 * WhatsApp markup: *bold*
 */

import { GOOGLE_REVIEW_URL } from './googleReview.js'

const interpolate = (template, vars) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (
    vars[key] == null || vars[key] === '' ? '—' : String(vars[key])
  ));

export const CUSTOMER_CARE_TEMPLATE_IDS = [
  'booking_confirmation',
  'signed_contract',
  'pickup_reminder',
  'during_rental',
  'return_reminder',
  'thank_you',
  'review_request',
  'loyalty',
  'winback',
  'referral',
];

const TEMPLATES = {
  booking_confirmation: {
    en: `Hello {{name}},

Thank you for choosing *{{brand}}*.

Your reservation *{{reservationId}}* is confirmed.

Vehicle: {{vehicle}}
Pickup: {{pickup}}
Return: {{returnDate}}

Our team is preparing everything so that your handover is smooth and on time. If you need to adjust anything before pickup, simply reply to this message — we are here to help.

Kind regards,
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Merci d’avoir choisi *{{brand}}*.

Votre réservation *{{reservationId}}* est confirmée.

Véhicule : {{vehicle}}
Prise en charge : {{pickup}}
Retour : {{returnDate}}

Notre équipe prépare tout pour que la remise des clés se déroule en toute fluidité. Si vous souhaitez modifier un détail avant le départ, répondez simplement à ce message — nous sommes à votre disposition.

Cordialement,
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Gracias por elegir *{{brand}}*.

Su reserva *{{reservationId}}* está confirmada.

Vehículo: {{vehicle}}
Recogida: {{pickup}}
Devolución: {{returnDate}}

Nuestro equipo lo prepara todo para que la entrega sea puntual y sin imprevistos. Si necesita ajustar algún detalle antes de la recogida, responda a este mensaje — estamos a su disposición.

Atentamente,
*El equipo {{brand}}*`,
  },
  pickup_reminder: {
    en: `Hello {{name}},

This is a short reminder from *{{brand}}* ahead of your pickup.

Reservation: *{{reservationId}}*
Vehicle: {{vehicle}}
Pickup: {{pickup}}

Please bring your driving licence and identity document. If you are running late or need a different meeting point, reply here and we will arrange it with you.

We look forward to welcoming you.
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Petit rappel de *{{brand}}* avant votre prise en charge.

Réservation : *{{reservationId}}*
Véhicule : {{vehicle}}
Prise en charge : {{pickup}}

Merci de vous munir de votre permis et d’une pièce d’identité. En cas de retard ou de changement de lieu, répondez ici — nous nous organisons avec vous.

Au plaisir de vous accueillir.
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Un breve recordatorio de *{{brand}}* antes de su recogida.

Reserva: *{{reservationId}}*
Vehículo: {{vehicle}}
Recogida: {{pickup}}

Lleve su permiso de conducir y un documento de identidad. Si llega con retraso o necesita otro punto de encuentro, responda aquí y lo organizamos con usted.

Le esperamos.
*El equipo {{brand}}*`,
  },
  during_rental: {
    en: `Hello {{name}},

We hope you are enjoying your {{vehicle}} with *{{brand}}*.

This is a quick message from our customer-care team to make sure everything is going well. If you need anything at all — a question about the car, an extra stop, or simply peace of mind — reply to this message and we will take care of it.

Your return is planned for {{returnDate}}. Should you wish to keep the vehicle a little longer, we can look at an extension for you.

Warm regards,
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Nous espérons que vous profitez pleinement de votre {{vehicle}} avec *{{brand}}*.

Petit message de notre équipe pour nous assurer que tout se passe bien. Une question sur le véhicule, un arrêt supplémentaire, ou simplement besoin d’être rassuré : répondez ici, nous nous en occupons.

Le retour est prévu le {{returnDate}}. Si vous souhaitez prolonger, nous étudions une extension avec plaisir.

Bien à vous,
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Esperamos que esté disfrutando de su {{vehicle}} con *{{brand}}*.

Le escribimos desde atención al cliente para asegurarnos de que todo va bien. Si necesita cualquier cosa — una duda sobre el coche, una parada extra o simplemente tranquilidad — responda a este mensaje y lo resolvemos.

La devolución está prevista el {{returnDate}}. Si desea quedarse el vehículo un poco más, podemos estudiar una extensión.

Un cordial saludo,
*El equipo {{brand}}*`,
  },
  return_reminder: {
    en: `Hello {{name}},

A courtesy reminder from *{{brand}}*: your {{vehicle}} is due back on *{{returnDate}}* (reservation {{reservationId}}).

If your plans have changed and you would like to extend the rental, reply to this message and we will check availability for you straight away.

Thank you for driving with us.
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Rappel courtois de *{{brand}}* : le retour de votre {{vehicle}} est prévu le *{{returnDate}}* (réservation {{reservationId}}).

Si vos plans ont changé et que vous souhaitez prolonger, répondez à ce message — nous vérifions immédiatement les disponibilités.

Merci de rouler avec nous.
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Recordatorio de *{{brand}}*: la devolución de su {{vehicle}} está prevista el *{{returnDate}}* (reserva {{reservationId}}).

Si sus planes han cambiado y desea extender el alquiler, responda a este mensaje y comprobamos la disponibilidad al momento.

Gracias por conducir con nosotros.
*El equipo {{brand}}*`,
  },
  thank_you: {
    en: `Hello {{name}},

Thank you for returning your {{vehicle}} and for placing your trust in *{{brand}}*.

It was a pleasure to look after reservation *{{reservationId}}*. We hope the journey was smooth from pickup to return.

Whenever you need a car again, we will be ready — with the same care, and with the benefits of a returning {{brand}} guest.

Kind regards,
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Merci d’avoir rendu votre {{vehicle}} et de nous avoir fait confiance chez *{{brand}}*.

Ce fut un plaisir de prendre soin de la réservation *{{reservationId}}*. Nous espérons que tout s’est bien passé, de la prise en charge au retour.

Dès que vous aurez à nouveau besoin d’un véhicule, nous serons là — avec le même soin, et les avantages d’un client fidèle {{brand}}.

Cordialement,
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Gracias por devolver su {{vehicle}} y por confiar en *{{brand}}*.

Fue un placer ocuparnos de la reserva *{{reservationId}}*. Esperamos que el viaje haya sido tan fluido a la ida como a la vuelta.

Cuando vuelva a necesitar un coche, estaremos listos — con el mismo cuidado y las ventajas de un cliente {{brand}} que regresa.

Atentamente,
*El equipo {{brand}}*`,
  },
  review_request: {
    en: `Hello {{name}},

We hope you have settled back in after your rental with *{{brand}}* ({{reservationId}}, {{vehicle}}).

Your opinion helps us stay at the standard you expect. If the experience was a good one, we would be grateful if you could leave a short Google review:

{{reviewLink}}

If anything was less than perfect, please tell us here instead — we will take care of it personally, without it going public.

Thank you again.
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Nous espérons que vous avez repris vos habitudes après votre location chez *{{brand}}* ({{reservationId}}, {{vehicle}}).

Votre avis nous aide à rester au niveau que vous attendez. Si l’expérience vous a plu, un court avis Google nous serait précieux :

{{reviewLink}}

Si quelque chose n’était pas parfait, dites-le-nous ici plutôt — nous nous en occupons personnellement, sans le rendre public.

Encore merci.
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Esperamos que ya esté de vuelta a la rutina tras su alquiler con *{{brand}}* ({{reservationId}}, {{vehicle}}).

Su opinión nos ayuda a mantener el nivel que espera. Si la experiencia fue buena, le agradeceríamos una breve reseña en Google:

{{reviewLink}}

Si algo no fue perfecto, cuéntelo aquí — lo atenderemos en persona, sin hacerlo público.

Gracias de nuevo.
*El equipo {{brand}}*`,
  },
  loyalty: {
    en: `Hello {{name}},

A note from *{{brand}}* to say thank you — you are now a *{{loyaltyLabel}}* guest with us.

That recognition is simply our way of looking after those who return. On your next booking we will make sure the experience feels personal: priority at the desk{{perkLine}}.

Whenever you are ready, we will have the right car waiting.

Warm regards,
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Un mot de *{{brand}}* pour vous remercier — vous êtes désormais un client *{{loyaltyLabel}}* chez nous.

C’est notre façon de choyer celles et ceux qui reviennent. Dès votre prochaine réservation, l’accueil sera plus personnel : priorité à l’agence{{perkLine}}.

Quand vous serez prêt, le bon véhicule vous attendra.

Bien à vous,
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Un mensaje de *{{brand}}* para darle las gracias: ya es cliente *{{loyaltyLabel}}* con nosotros.

Es nuestra manera de cuidar a quienes regresan. En su próxima reserva, la experiencia será más personal: prioridad en agencia{{perkLine}}.

Cuando quiera, tendremos el coche adecuado esperándole.

Un cordial saludo,
*El equipo {{brand}}*`,
  },
  winback: {
    en: `Hello {{name}},

It has been a little while since your last journey with *{{brand}}*, and we would be delighted to welcome you again.

Whenever you need a car — a weekend, a business trip, or something longer — reply to this message with your dates and we will prepare a thoughtful proposal around the vehicle that suits you.

Your previous reservation {{reservationId}} is still on file, so handover will feel familiar.

We look forward to seeing you.
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Cela fait un moment depuis votre dernière location chez *{{brand}}*, et nous serions ravis de vous revoir.

Dès que vous aurez besoin d’un véhicule — un week-end, un déplacement, un séjour plus long — répondez avec vos dates, nous préparons une proposition soignée autour de la voiture qui vous convient.

Votre précédente réservation {{reservationId}} reste en dossier, la remise des clés n’en sera que plus simple.

Au plaisir de vous retrouver.
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Ha pasado un tiempo desde su último viaje con *{{brand}}* y nos encantaría volver a recibirle.

Cuando necesite un coche — un fin de semana, un viaje de negocios o algo más largo — responda con sus fechas y prepararemos una propuesta cuidada con el vehículo que mejor le encaje.

Su reserva anterior {{reservationId}} sigue en ficha, así que la entrega le resultará familiar.

Esperamos verle pronto.
*El equipo {{brand}}*`,
  },
  referral: {
    en: `Hello {{name}},

Thank you for thinking of *{{brand}}* for the people you trust.

Your personal referral code is *{{referralCode}}*. When someone you introduce completes their first rental, we will look after both of you — a gesture of thanks on a future booking.

They can mention the code when they reserve, or simply give us your name.

With our appreciation,
*The {{brand}} Team*`,
    fr: `Bonjour {{name}},

Merci de penser à *{{brand}}* pour les personnes de confiance.

Votre code de parrainage est *{{referralCode}}*. Lorsqu’une personne que vous nous présentez termine sa première location, nous prenons soin de vous deux — une attention sur une prochaine réservation.

Ils peuvent indiquer le code en réservant, ou simplement donner votre nom.

Avec toute notre reconnaissance,
*L’équipe {{brand}}*`,
    es: `Hola {{name}},

Gracias por pensar en *{{brand}}* para las personas de su confianza.

Su código de referido es *{{referralCode}}*. Cuando alguien a quien presente complete su primer alquiler, cuidaremos de los dos — un detalle en una próxima reserva.

Pueden indicar el código al reservar, o simplemente dar su nombre.

Con nuestro agradecimiento,
*El equipo {{brand}}*`,
  },
};

export const normalizeCareLanguage = (language) => {
  const lang = String(language || '').slice(0, 2).toLowerCase();
  return lang === 'fr' || lang === 'es' ? lang : 'en';
};

export const buildCustomerCareWhatsAppMessage = ({
  templateId,
  language = 'en',
  brand = 'HDN Car',
  name = '',
  reservationId = '',
  vehicle = '',
  pickup = '',
  returnDate = '',
  link = '',
  reviewLink = '',
  referralCode = '',
  loyaltyLabel = '',
  perkLine = '',
} = {}) => {
  const lang = normalizeCareLanguage(language);
  const pack = TEMPLATES[templateId];
  if (!pack) return '';
  const template = pack[lang] || pack.en;
  const review = templateId === 'review_request'
    ? GOOGLE_REVIEW_URL
    : (reviewLink || link || '');
  return interpolate(template, {
    brand,
    name: name || '—',
    reservationId: reservationId || '—',
    vehicle: vehicle || '—',
    pickup: pickup || '—',
    returnDate: returnDate || '—',
    link: link || '—',
    reviewLink: review,
    referralCode: referralCode || '—',
    loyaltyLabel: loyaltyLabel || (lang === 'fr' ? 'Fidèle' : lang === 'es' ? 'Fiel' : 'valued'),
    perkLine: perkLine || '',
  }).trim();
};

export default buildCustomerCareWhatsAppMessage;
