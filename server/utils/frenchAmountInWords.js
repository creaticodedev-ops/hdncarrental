/**
 * French amount-in-words for Moroccan invoices (dirhams + centimes).
 * Uses integer centimes to avoid floating-point drift.
 */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];
const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
];

const joinHyphen = (parts) => parts.filter(Boolean).join('-');

const underHundred = (n) => {
  if (n < 20) return UNITS[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS[t];
    if (u === 1 && t !== 8) return `${TENS[t]}-et-un`;
    return joinHyphen([TENS[t], UNITS[u]]);
  }
  if (n < 80) {
    // 70-79 → soixante-dix …
    const rest = n - 60;
    if (rest === 11) return 'soixante-et-onze';
    return joinHyphen(['soixante', underHundred(rest)]);
  }
  // 80-99
  if (n === 80) return 'quatre-vingts';
  const rest = n - 80;
  return joinHyphen(['quatre-vingt', underHundred(rest)]);
};

const underThousand = (n) => {
  if (n < 100) return underHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundred = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 && h > 1 ? 's' : ''}`;
  if (rest === 0) return hundred;
  return `${h === 1 ? 'cent' : `${UNITS[h]} cent`} ${underHundred(rest)}`;
};

const chunkScale = (n, singular, plural) => {
  if (n === 0) return '';
  if (n === 1) return singular === 'mille' ? 'mille' : `un ${singular}`;
  return `${integerToFrench(n)} ${plural}`;
};

/** Convert a non-negative integer to French words (no currency). */
export const integerToFrench = (value) => {
  let n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) n = 0;
  if (n === 0) return 'zéro';
  if (n < 1000) return underThousand(n);

  const billions = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;

  const parts = [
    chunkScale(billions, 'milliard', 'milliards'),
    chunkScale(millions, 'million', 'millions'),
    chunkScale(thousands, 'mille', 'mille'),
    rest ? underThousand(rest) : '',
  ].filter(Boolean);

  return parts.join(' ');
};

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Convert a money amount to French words with MAD / centimes.
 * @param {number|string} amount
 * @param {{ currency?: string }} [options]
 * @returns {{ cents: number, words: string, sentence: string }}
 */
export const amountToFrenchMadWords = (amount, { currency = 'MAD' } = {}) => {
  const raw = Number(amount);
  const safe = Number.isFinite(raw) ? raw : 0;
  const totalCents = Math.round(Number(safe.toFixed(2)) * 100);
  const dirhams = Math.floor(Math.abs(totalCents) / 100);
  const centimes = Math.abs(totalCents) % 100;

  const dirhamWord = dirhams <= 1 ? 'dirham' : 'dirhams';
  const centimeWord = centimes <= 1 ? 'centime' : 'centimes';
  const dirhamPart = `${integerToFrench(dirhams)} ${dirhamWord}`;
  const centimePart = `${integerToFrench(centimes)} ${centimeWord}`;
  const words = capitalizeFirst(`${dirhamPart} et ${centimePart}`);
  const cur = String(currency || 'MAD').toUpperCase() === 'MAD' ? '' : ` (${currency})`;
  const sentence = `Arrêtée la présente facture à la somme de : ${words}${cur}.`;

  return { cents: totalCents, words, sentence };
};

export default {
  integerToFrench,
  amountToFrenchMadWords,
};
