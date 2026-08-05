import PickupLocation from "../models/PickupLocation.js";
import { safeErrorMessage } from "../utils/helpers.js";

const defaultLocations = [
    { name: 'Casablanca Airport', city: 'Casablanca', address: 'Mohammed V International Airport, Casablanca', locationType: 'airport', deliveryFee: 0, isActive: true },
    { name: 'Marrakech Airport', city: 'Marrakech', address: 'Marrakech Menara Airport', locationType: 'airport', deliveryFee: 0, isActive: true },
    { name: 'Rabat City Center', city: 'Rabat', address: 'Avenue Mohammed V, Rabat', locationType: 'office', deliveryFee: 0, isActive: true },
    { name: 'Sale Office', city: 'Sale', address: 'Boulevard Mohammed VI, Sale', locationType: 'office', deliveryFee: 0, isActive: true },
];

const ALLOWED_TYPES = new Set(['airport', 'office', 'hotel', 'custom']);

const parseDeliveryFee = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100) / 100;
};

export const seedPickupLocations = async () => {
    const count = await PickupLocation.countDocuments();
    if (count === 0) {
        await PickupLocation.insertMany(defaultLocations);
        console.log('Default pickup locations seeded');
    }
};

export const getActivePickupLocations = async (req, res) => {
    try {
        const locations = await PickupLocation.find({ isActive: true }).sort({ city: 1, name: 1 });
        res.json({ success: true, locations });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to load pickup locations' });
    }
};

export const getAllPickupLocations = async (req, res) => {
    try {
        const locations = await PickupLocation.find({}).sort({ createdAt: -1 });
        res.json({ success: true, locations });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to load locations' });
    }
};

export const createPickupLocation = async (req, res) => {
    try {
        const { name, city, address, googleMapsLink, locationType, deliveryFee } = req.body;

        if (!name?.trim() || !city?.trim() || !address?.trim()) {
            return res.status(400).json({ success: false, message: 'Name, city, and address are required' });
        }

        const type = ALLOWED_TYPES.has(locationType) ? locationType : 'custom';

        const location = await PickupLocation.create({
            name: name.trim(),
            city: city.trim(),
            address: address.trim(),
            googleMapsLink: googleMapsLink || '',
            locationType: type,
            deliveryFee: parseDeliveryFee(deliveryFee),
        });

        res.status(201).json({ success: true, message: 'Pickup location added', location });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: safeErrorMessage(error, 'Failed to create location') });
    }
};

export const updatePickupLocation = async (req, res) => {
    try {
        const { locationId, name, city, address, googleMapsLink, locationType, deliveryFee } = req.body;

        const location = await PickupLocation.findById(locationId);
        if (!location) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }

        if (name) location.name = name.trim();
        if (city) location.city = city.trim();
        if (address) location.address = address.trim();
        if (googleMapsLink !== undefined) location.googleMapsLink = googleMapsLink;
        if (locationType && ALLOWED_TYPES.has(locationType)) location.locationType = locationType;
        if (deliveryFee !== undefined) location.deliveryFee = parseDeliveryFee(deliveryFee);

        await location.save();
        res.json({ success: true, message: 'Pickup location updated', location });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: safeErrorMessage(error, 'Failed to update location') });
    }
};

export const deletePickupLocation = async (req, res) => {
    try {
        const { locationId } = req.body;
        const location = await PickupLocation.findByIdAndDelete(locationId);

        if (!location) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }

        res.json({ success: true, message: 'Pickup location deleted' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to delete location' });
    }
};

export const togglePickupLocation = async (req, res) => {
    try {
        const { locationId } = req.body;
        const location = await PickupLocation.findById(locationId);

        if (!location) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }

        location.isActive = !location.isActive;
        await location.save();

        res.json({
            success: true,
            message: `Location ${location.isActive ? 'enabled' : 'disabled'}`,
            location
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Failed to toggle location' });
    }
};
