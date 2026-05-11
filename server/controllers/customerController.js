import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import CustomerPayment from '../models/CustomerPayment.js';

// 1. ADD CUSTOMER
export const addCustomer = async (req, res) => {
    try {
        const { name, phone, nic, address, creditLimit } = req.body;
        const shopId = req.user.shopId;

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: 'Name and phone are required' });
        }

        const existing = await Customer.findOne({ shopId, phone });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Customer with this phone already exists in your shop' });
        }

        const customer = await Customer.create({
            shopId, name, phone, nic, address,
            creditLimit: creditLimit !== undefined ? Number(creditLimit) : 5000
        });

        return res.status(201).json({ success: true, data: customer });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
};

// 2. GET ALL CUSTOMERS
export const getCustomers = async (req, res) => {
    try {
        const { includeInactive, search } = req.query;
        let query = { shopId: req.user.shopId };

        if (includeInactive !== 'true') {
            query.status = 'active';
        }

        // BUG 1 FIX: search by name or phone — required for POS cashier credit sale flow
        if (search && search.trim() !== '') {
            const searchRegex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: searchRegex },
                { phone: searchRegex }
            ];
        }

        const customers = await Customer.find(query).sort({ name: 1 }).lean();
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. GET CUSTOMER BY ID + RECENT PAYMENTS
export const getCustomerById = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const customer = await Customer.findOne({ _id: req.params.id, shopId }).lean();

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const recentPayments = await CustomerPayment.find({ shopId, customerId: customer._id })
            .sort({ paidAt: -1 })
            .limit(10)
            .populate('recordedBy', 'name role')
            .lean();

        return res.status(200).json({ success: true, data: { customer, recentPayments } });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch customer details' });
    }
};

// 4. UPDATE CUSTOMER
export const updateCustomer = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const { name, phone, nic, address, creditLimit, status } = req.body;

        const customer = await Customer.findOne({ _id: req.params.id, shopId });
        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Check phone duplicate if changing phone
        if (phone && phone !== customer.phone) {
            const existing = await Customer.findOne({ shopId, phone });
            if (existing) {
                return res.status(400).json({ success: false, error: 'Phone number already in use by another customer' });
            }
        }

        // BUG 3 FIX: Only include fields that were actually sent — avoid overwriting with undefined
        const updateData = {};
        if (name !== undefined)        updateData.name = name;
        if (phone !== undefined)       updateData.phone = phone;
        if (nic !== undefined)         updateData.nic = nic;
        if (address !== undefined)     updateData.address = address;
        if (creditLimit !== undefined) updateData.creditLimit = Number(creditLimit);
        if (status !== undefined)      updateData.status = status;

        const updatedCustomer = await Customer.findByIdAndUpdate(
            customer._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, data: updatedCustomer });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
};

// 5. RECORD PAYMENT (Debt Settlement — Atomic Transaction)
export const recordPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shopId = req.user.shopId;
        const customerId = req.params.id;
        const { amount, paymentMethod, note } = req.body;

        const paymentAmount = Number(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            throw new Error("Payment amount must be greater than zero");
        }

        const customer = await Customer.findOne({ _id: customerId, shopId }).session(session);
        if (!customer) throw new Error("Customer not found");

        // 🛡️ FINANCIAL SAFETY: Cannot over-pay their debt
        if (paymentAmount > customer.creditBalance) {
            throw new Error(
                `Payment of Rs.${paymentAmount} exceeds outstanding balance of Rs.${customer.creditBalance}`
            );
        }

        customer.creditBalance -= paymentAmount;
        await customer.save({ session });

        const receiptNumber = `REC-${shopId.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;

        const payment = await CustomerPayment.create([{
            shopId,
            customerId,
            receiptNumber,
            amount: paymentAmount,
            paymentMethod: paymentMethod || 'Cash',
            note: note || '',
            recordedBy: req.user._id,
            paidAt: new Date()
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ success: true, data: { customer, payment: payment[0] } });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, error: error.message });
    }
};

// 6. TOGGLE CUSTOMER STATUS (Active / Inactive)
export const toggleCustomerStatus = async (req, res) => {
    try {
        const shopId = req.user.shopId;
        const customer = await Customer.findOne({ _id: req.params.id, shopId });

        if (!customer) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const newStatus = customer.status === 'active' ? 'inactive' : 'active';
        customer.status = newStatus;
        await customer.save();

        res.status(200).json({
            success: true,
            message: `Customer is now ${newStatus}`,
            data: customer
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};