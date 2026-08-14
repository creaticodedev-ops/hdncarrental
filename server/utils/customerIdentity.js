/**
 * CRM / promotion identity for bookings.
 *
 * Guest CRM profiles, promotion per-customer limits and customer statistics are all
 * keyed by a single string. Online customers always supply an email, but desk
 * (walk-in) customers may not — and in that case the email field must stay empty
 * rather than holding a placeholder the owner never typed.
 *
 * `crmKey` carries that internal identity instead: the email when there is one,
 * otherwise a value derived from the (mandatory) phone number. The derived shape is
 * kept byte-compatible with the placeholder emails written before `crmKey` existed,
 * so historical bookings keep resolving to the same CRM profile.
 */

const PLACEHOLDER_DOMAIN = '@local.americonfort';
const PLACEHOLDER_PREFIX = 'walkin+';

/** Phone-derived CRM identity for a desk booking without an email. */
export const deskCrmKey = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').slice(-9);
  return `${PLACEHOLDER_PREFIX}${digits || Date.now()}${PLACEHOLDER_DOMAIN}`;
};

/** True for internal placeholder identities that must never be shown or printed. */
export const isPlaceholderEmail = (email) => {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return false;
  return value.endsWith(PLACEHOLDER_DOMAIN) || value.startsWith(PLACEHOLDER_PREFIX);
};

/** Resolve the CRM identity of a booking, tolerating pre-`crmKey` documents. */
export const bookingCrmKey = (booking) => {
  const key = String(booking?.crmKey || '').trim().toLowerCase();
  if (key) return key;
  return String(booking?.customerEmail || '').trim().toLowerCase();
};

/**
 * Aggregation stage adding `crmIdentity` to each booking, mirroring `bookingCrmKey`.
 * Use before grouping customers so bookings written either side of the migration
 * collapse onto one profile.
 */
export const crmIdentityStage = () => ({
  $addFields: {
    crmIdentity: {
      $toLower: {
        $cond: [
          { $in: [{ $ifNull: ['$crmKey', ''] }, [null, '']] },
          { $ifNull: ['$customerEmail', ''] },
          '$crmKey',
        ],
      },
    },
  },
});

/** Match either identity column for a known CRM key. */
export const crmIdentityMatch = (key) => {
  const value = String(key || '').trim().toLowerCase();
  return {
    $or: [{ crmKey: value }, { crmKey: { $in: [null, ''] }, customerEmail: value }],
  };
};

export default {
  deskCrmKey,
  isPlaceholderEmail,
  bookingCrmKey,
  crmIdentityStage,
  crmIdentityMatch,
};
