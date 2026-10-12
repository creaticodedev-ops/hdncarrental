/** Lets homepage sections hand a pickup city to the Hero booking form. */
export const BOOKING_PREFILL_EVENT = 'hdn:booking-prefill'

export const requestBookingPrefill = (detail = {}) => {
  window.dispatchEvent(new CustomEvent(BOOKING_PREFILL_EVENT, { detail }))
}
