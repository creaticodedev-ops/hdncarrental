import { NAP, SITE_NAME } from '../constants.js'

/**
 * Trust / E-E-A-T pages. Facts only — NAP matches Footer, no invented awards.
 */
export const TRUST_PAGES = [
  {
    slug: 'a-propos',
    aliases: ['about'],
    path: '/a-propos',
    title: `À propos de ${SITE_NAME} — location de voitures au Maroc`,
    description:
      `${SITE_NAME} est une agence de location de voitures basée à Safi. Flotte entretenue, réservation en ligne, prise en charge ville ou aéroport selon les points réellement actifs.`,
    h1: `À propos de ${SITE_NAME}`,
    intro:
      `${SITE_NAME} est une agence marocaine de location de voitures, basée à Safi (quartier Azib Derai). Nous louons des véhicules entretenus à des voyageurs, familles et professionnels qui ont besoin d’une voiture fiable pour Casablanca, Marrakech, la côte atlantique ou un road trip plus long — sans inventer de comptoirs ni de labels que nous n’avons pas.`,
    sections: [
      {
        heading: 'Qui nous sommes',
        body: `L’équipe prépare les véhicules depuis Safi et organise les prises en charge sur les lieux réellement ouverts dans le système de réservation (ville ou aéroport). Le contact se fait par téléphone, e-mail ou WhatsApp — les mêmes coordonnées que sur cette page et dans le pied de site.`,
      },
      {
        heading: 'Ce que nous proposons',
        body: 'Citadines, compactes, SUV, familiales et boîtes automatiques selon le stock du moment. Les tarifs journaliers sont affichés sur chaque fiche. La réservation en ligne confirme la demande ; l’équipe finalise ensuite les détails (documents, heure, lieu).',
      },
      {
        heading: 'Où nous opérons',
        body: 'Siège à Safi. Couverture des grandes villes du Maroc via livraison ou points actifs — pas d’agences fictives. Les pages villes et aéroports du site n’existent que pour des services honnêtes.',
      },
    ],
    faqs: [
      {
        question: `${SITE_NAME} a-t-il une agence à Marrakech ou Casablanca ?`,
        answer:
          'Le siège est à Safi. Marrakech et Casablanca sont desservies lorsque les points de prise en charge correspondants (dont aéroports RAK et CMN s’ils sont actifs) sont ouverts à vos dates.',
      },
    ],
  },
  {
    slug: 'contact',
    aliases: [],
    path: '/contact',
    title: `Contact ${SITE_NAME} — téléphone, WhatsApp, Safi`,
    description: `Contactez ${SITE_NAME} à Safi : ${NAP.telephoneDisplay}, ${NAP.email}. Location de voiture au Maroc, questions flotte et prise en charge.`,
    h1: `Contacter ${SITE_NAME}`,
    intro: `Une question sur un véhicule, un aéroport ou vos dates ? Écrivez-nous ou appelez. Nous répondons depuis Safi, aux heures ouvrables marocaines.`,
    sections: [
      {
        heading: 'Coordonnées',
        body: `${NAP.legalName}, ${NAP.streetAddress}, ${NAP.addressLocality}, Maroc. Téléphone ${NAP.telephoneDisplay}. E-mail ${NAP.email}.`,
      },
      {
        heading: 'Réservation',
        body: 'Le plus simple reste de choisir vos dates et un lieu sur le catalogue, puis de confirmer en ligne. Pour un cas particulier (horaire de vol, siège enfant, aller simple), passez par WhatsApp ou e-mail avec votre référence.',
      },
    ],
    faqs: [
      {
        question: 'Quel est le délai de réponse ?',
        answer:
          'En journée, généralement sous quelques heures via WhatsApp ou e-mail. Les demandes de nuit sont traitées le matin suivant (heure du Maroc).',
      },
    ],
  },
  {
    slug: 'faq',
    aliases: [],
    path: '/faq',
    title: `FAQ location voiture Maroc — ${SITE_NAME}`,
    description:
      'Questions fréquentes : documents, caution, aéroports, automatique, aller simple. Réponses de HDN Car, agence à Safi.',
    h1: 'Questions fréquentes — location de voiture au Maroc',
    intro:
      'Les réponses ci-dessous correspondent à notre fonctionnement réel. Les montants de caution et la liste exacte des documents sont confirmés à la réservation, selon le véhicule.',
    sections: [
      {
        heading: 'Avant de réserver',
        body: 'Vérifiez permis, identité, et si vous atterrissez à CMN ou RAK. Choisissez catégorie (économique, compacte, SUV) selon bagages et routes — Atlas et cols : SUV plus confortable.',
      },
    ],
    faqs: [
      {
        question: 'Quels documents faut-il ?',
        answer:
          'Permis de conduire valide, pièce d’identité ou passeport, et moyen de paiement pour la caution selon le véhicule. Un permis international peut être demandé selon nationalité et durée de séjour.',
      },
      {
        question: 'Proposez-vous la location à l’aéroport ?',
        answer:
          'Oui sur les points aéroport réellement actifs (Casablanca CMN et Marrakech RAK lorsqu’ils sont ouverts). Il n’y a pas de page aéroport Agadir tant que ce lieu n’est pas un point bookable.',
      },
      {
        question: 'Puis-je louer une voiture automatique ?',
        answer:
          'Oui selon stock. Filtrez la catégorie automatique ou vérifiez la transmission sur la fiche du véhicule.',
      },
      {
        question: 'Un aller simple est-il possible ?',
        answer:
          'Oui si le lieu de retour est actif pour vos dates. D’éventuels frais de restitution sont indiqués avant confirmation.',
      },
      {
        question: 'Faut-il un compte pour réserver ?',
        answer: 'Non. La réservation en ligne se fait sans créer de compte client.',
      },
    ],
  },
  {
    slug: 'conditions-de-location',
    aliases: ['terms'],
    path: '/conditions-de-location',
    title: `Conditions de location — ${SITE_NAME}`,
    description:
      'Conditions générales de location HDN Car : documents, usage du véhicule, carburant, caution et restitution. Informations opérationnelles, confirmées à la remise des clés.',
    h1: 'Conditions de location',
    intro:
      'Ces points décrivent le cadre habituel d’une location chez HDN Car. Le contrat remis à la prise en charge prévaut. Nous ne publions pas ici de clauses inventées : en cas de doute, demandez confirmation avant de signer.',
    sections: [
      {
        heading: 'Conducteur et documents',
        body: 'Le conducteur présente un permis valide et une pièce d’identité. L’âge minimum et l’ancienneté de permis peuvent varier selon la catégorie (souvent 21 ans, parfois plus pour certains véhicules). Un second conducteur, s’il est autorisé, doit être déclaré.',
      },
      {
        heading: 'Usage du véhicule',
        body: 'Circulation sur routes ouvertes au Maroc, dans le respect du code de la route. Les pistes non bitumées, le franchissement hors contrat et le sous-location ne sont pas autorisés sauf accord écrit. Amendes et péages restent à la charge du locataire.',
      },
      {
        heading: 'Carburant et restitution',
        body: 'Le niveau de carburant à la prise en charge doit être rendu équivalent, sauf mention contraire sur le contrat. Signalez tout incident immédiatement. L’état du véhicule est constaté à la sortie et au retour.',
      },
      {
        heading: 'Caution et assurance',
        body: 'Une caution (souvent une préautorisation en MAD) est exigée selon le modèle. L’assurance de base suit la réglementation marocaine ; franchise et exclusions figurent au contrat. Voir aussi nos guides assurance et caution.',
      },
    ],
    faqs: [
      {
        question: 'Où lire le contrat complet ?',
        answer:
          'Le contrat est généré pour votre réservation et présenté avant signature (en agence ou via le lien de signature). Les pages guides du site expliquent les notions, elles ne remplacent pas ce document.',
      },
    ],
  },
  {
    slug: 'confidentialite',
    aliases: ['privacy'],
    path: '/confidentialite',
    title: `Confidentialité — ${SITE_NAME}`,
    description:
      'Politique de confidentialité HDN Car : données de réservation, cookies, Google Analytics. Contact : haddanecar@gmail.com.',
    h1: 'Politique de confidentialité',
    intro:
      'Nous collectons uniquement ce qui est nécessaire pour traiter une location et améliorer le site. Pas de revente de fichiers clients.',
    sections: [
      {
        heading: 'Données de réservation',
        body: 'Nom, téléphone, e-mail, dates, lieu et véhicule choisi sont utilisés pour confirmer et exécuter la location, et pour vous recontacter (y compris WhatsApp si vous avez initié cet échange).',
      },
      {
        heading: 'Mesure d’audience',
        body: 'Le site utilise Google Analytics 4 (identifiant de mesure publié dans le code) avec anonymisation d’IP, pour comprendre les pages visitées et les conversions de réservation. Vous pouvez bloquer les cookies analytics via votre navigateur.',
      },
      {
        heading: 'Cookies techniques',
        body: 'La langue d’interface et la session d’administration (espace staff) utilisent des cookies ou le stockage local. Ils ne servent pas à de la publicité tierce sur ce site.',
      },
      {
        heading: 'Vos droits',
        body: `Pour accéder, corriger ou supprimer des données de réservation, écrivez à ${NAP.email} en précisant votre référence.`,
      },
    ],
    faqs: [],
  },
]

export const getTrustPage = (slug) =>
  TRUST_PAGES.find(
    (p) => p.slug === String(slug || '').toLowerCase() || (p.aliases || []).includes(String(slug || '').toLowerCase()),
  )
