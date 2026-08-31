import Booking from '../models/Booking.js';
import {
  bookingCommercialsAreStale,
  presentBooking,
  presentBookings,
} from '../utils/helpers.js';

export { presentBooking, presentBookings };

export const persistStaleRentalCommercials = async (originals, presented) => {
  const ops = [];
  const list = Array.isArray(originals) ? originals : [];
  const next = Array.isArray(presented) ? presented : [];
  for (let i = 0; i < next.length; i += 1) {
    const before = list[i];
    const after = next[i];
    if (!before?._id || !after || !bookingCommercialsAreStale(before, after)) continue;
    const $set = {
      price: after.price,
      'priceBreakdown.days': after.priceBreakdown?.days,
    };
    if (after.priceBreakdown?.pricePerDay != null) $set['priceBreakdown.pricePerDay'] = after.priceBreakdown.pricePerDay;
    if (after.priceBreakdown?.rentalPrice != null) $set['priceBreakdown.rentalPrice'] = after.priceBreakdown.rentalPrice;
    if (after.priceBreakdown?.extraDriverFee != null) $set['priceBreakdown.extraDriverFee'] = after.priceBreakdown.extraDriverFee;
    if (after.priceBreakdown?.subtotal != null) $set['priceBreakdown.subtotal'] = after.priceBreakdown.subtotal;
    if (after.priceBreakdown?.total != null) $set['priceBreakdown.total'] = after.priceBreakdown.total;
    if (Array.isArray(after.priceBreakdown?.lineItems)) {
      $set['priceBreakdown.lineItems'] = after.priceBreakdown.lineItems;
    }
    if (after.pricingSnapshot?.finalPrice != null) {
      $set['pricingSnapshot.finalPrice'] = after.pricingSnapshot.finalPrice;
    }
    if (after.pricingSnapshot?.extras?.extraDriverFee != null) {
      $set['pricingSnapshot.extras.extraDriverFee'] = after.pricingSnapshot.extras.extraDriverFee;
    }
    if (after.completion && after.completion.amountDue != null) {
      $set['completion.amountDue'] = after.completion.amountDue;
    }
    ops.push({
      updateOne: {
        filter: { _id: before._id },
        update: { $set },
      },
    });
  }
  if (!ops.length) return 0;
  await Booking.bulkWrite(ops, { ordered: false });
  return ops.length;
};

export const presentAndPersistBookings = async (bookings) => {
  const originals = Array.isArray(bookings) ? bookings : [];
  const presented = presentBookings(originals);
  try {
    await persistStaleRentalCommercials(originals, presented);
  } catch (error) {
    console.error('Failed to persist rental-duration alignment:', error.message);
  }
  return presented;
};
