import Supplier from '../models/Supplier.js';

// @desc    Add a new supplier
export const addSupplier = async (req, res) => {
try {
const shopId = req.user.shopId; // 💡 PRO FIX: req.user.id නෙවෙයි, shopId එක ගන්න ඕනේ
const { name, contactPerson, phone, email, address, category } = req.body;

    // 💡 PRO FIX: Duplicate Phone Check (Tenant specific)
    const existingSupplier = await Supplier.findOne({ shopId, phone });
    if (existingSupplier) {
        return res.status(400).json({ success: false, error: 'A supplier with this phone number already exists.' });
    }

    // 💡 PRO FIX: Explicit Field Assignment (Mass Assignment Protection)
    // කවුරුහරි Postman එකෙන් balance: -50000 කියලා එව්වත් ඒක සේව් වෙන්නේ නෑ.
    const supplier = await Supplier.create({
        shopId,
        name,
        contactPerson,
        phone,
        email,
        address,
        category
    });

    res.status(201).json({ success: true, data: supplier });
} catch (error) {
    res.status(400).json({ success: false, error: error.message });
}
};

// @desc    Get all active suppliers
export const getSuppliers = async (req, res) => {
try {
const suppliers = await Supplier.find({
shopId: req.user.shopId, // 💡 PRO FIX: correct ID
status: 'active'
}).sort({ name: 1 });

    res.status(200).json({ success: true, data: suppliers });
} catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
}
};

// @desc    Update a supplier
export const updateSupplier = async (req, res) => {
try {
const { id } = req.params;
const shopId = req.user.shopId;

    // 💡 PRO FIX: Mass Assignment Protection
    // updateData එකෙන් 'balance' සහ 'shopId' කියන fields අයින් කරනවා. 
    // ණය වෙනස් කරන්න පුළුවන් GRN module එකට විතරයි!
    const { balance, shopId: injectedShopId, ...updateData } = req.body;

    // 💡 PRO FIX: Tenant Isolation (shopId අනිවාර්යයි)
    const supplier = await Supplier.findOneAndUpdate(
        { _id: id, shopId: shopId },
        updateData,
        { new: true, runValidators: true }
    );

    if (!supplier) {
        return res.status(404).json({ success: false, message: "Supplier not found or unauthorized" });
    }

    res.status(200).json({ success: true, data: supplier });
} catch (error) {
    res.status(400).json({ success: false, error: error.message });
}
};

// 💡 PRO FIX: අනිවාර්යයෙන්ම තියෙන්න ඕන "Delete (Archive)" එක ඇඩ් කළා
// @desc    Archive a supplier
export const deleteSupplier = async (req, res) => {
try {
const { id } = req.params;
const shopId = req.user.shopId;

    const supplier = await Supplier.findOneAndUpdate(
        { _id: id, shopId: shopId },
        { status: 'archived' },
        { new: true }
    );

    if (!supplier) {
        return res.status(404).json({ success: false, message: "Supplier not found or unauthorized" });
    }

    res.status(200).json({ success: true, message: "Supplier archived successfully" });
} catch (error) {
    res.status(500).json({ success: false, error: 'Failed to archive supplier' });
}
};