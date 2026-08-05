import mongoose from "mongoose";

const pickupLocationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    googleMapsLink: { type: String, default: '' },
    locationType: {
        type: String,
        enum: ['airport', 'hotel', 'office', 'custom'],
        default: 'custom'
    },
    /** Delivery / transfer fee in MAD (DH). 0 = free delivery. */
    deliveryFee: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const PickupLocation = mongoose.model('PickupLocation', pickupLocationSchema);

export default PickupLocation;
