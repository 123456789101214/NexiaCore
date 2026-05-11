import mongoose from 'mongoose';
import GRN from '../models/GRN.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';
import { randomBytes } from 'crypto';

/**
 * @desc    Create GRN with Financial Integrity & Stock Audit
 */
export const createGRN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { supplierId, items, totalAmount, paidAmount, paymentType, supplierInvoiceNumber } = req.body;
        const shopId = req.user.shopId;

        if (!items || items.length === 0) throw new Error("Cannot create an empty GRN");

        // 1. Pre-generate GRN ID for Audit Linking
        const grnObjectId = new mongoose.Types.ObjectId();

        const supplier = await Supplier.findOne({ _id: supplierId, shopId }).session(session);
        if (!supplier) throw new Error("Supplier not found or unauthorized");

        const processedItems = [];
        const stockMovements = [];
        const productOperations = [];
        let calculatedTotal = 0;

        for (const item of items) {
            const product = await Product.findOne({ _id: item.productId, shopId }).session(session);
            if (!product) throw new Error(`Product '${item.name}' missing`);
            if (product.status !== 'active') throw new Error(`Product '${product.name}' is archived.`);

            const previousUnitCost = product.buyingPrice || 0;
            const previousSellingPrice = product.price || 0;
            const subTotal = Number(item.quantity) * Number(item.unitCost);
            calculatedTotal += subTotal;

            // Prepare Bulk Update for Product
            productOperations.push({
                updateOne: {
                    filter: { _id: product._id, shopId },
                    update: { 
                        $inc: { stock: Number(item.quantity) },
                        $set: { 
                            buyingPrice: Number(item.unitCost),
                            price: Number(item.sellingPrice),
                            expiryDate: item.expiryDate ? new Date(item.expiryDate) : product.expiryDate,
                            lastPurchasedAt: new Date(),
                            updatedBy: req.user._id
                        }
                    }
                }
            });

            // 📊 Prepare Audit Log Snapshot
            stockMovements.push({
                shopId,
                productId: product._id,
                type: 'purchase',
                quantity: Number(item.quantity),
                previousBalance: product.stock,
                balanceAfter: product.stock + Number(item.quantity),
                referenceId: grnObjectId, // 💡 Linked to pre-generated ID
                onModel: 'GRN',
                userId: req.user._id,
                note: `Inward: ${product.name} @ Rs.${item.unitCost}`
            });

            processedItems.push({
                productId: product._id,
                name: product.name,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost),
                previousUnitCost,
                previousSellingPrice,
                sellingPrice: Number(item.sellingPrice),
                subTotal,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
            });
        }

        // 2. Financial Integrity Check
        if (Math.abs(calculatedTotal - totalAmount) > 1) {
            throw new Error("Financial mismatch detected in GRN calculation.");
        }

        const balanceAmount = Math.max(0, calculatedTotal - (paidAmount || 0));

        // 3. Execute DB Updates Atomically
        await Product.bulkWrite(productOperations, { session });
        await StockMovement.insertMany(stockMovements, { session });

        if (paymentType !== 'Cash' && balanceAmount > 0) {
            await Supplier.updateOne(
                { _id: supplierId, shopId },
                { $inc: { balance: balanceAmount } },
                { session }
            );
        }

        const grnNumber = `GRN-${shopId.toString().slice(-4).toUpperCase()}-${Date.now()}`;
        
        const grn = await GRN.create([{
            _id: grnObjectId, // 💡 Using the pre-linked ID
            shopId,
            grnNumber,
            supplierId,
            supplierInvoiceNumber,
            items: processedItems,
            totalAmount: calculatedTotal,
            paidAmount: paidAmount || 0,
            balanceAmount,
            paymentType,
            enteredBy: req.user._id,
            status: 'completed'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ success: true, data: grn[0] });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * @desc    Get Paginated GRN Audit Trail
 */
export const getGRNList = async (req, res) => {
    try {
        const { startDate, endDate, supplierId, status, page = 1, limit = 20 } = req.query;
        let query = { shopId: req.user.shopId };

        if (startDate) {
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date(startDate);
            query.createdAt = {
                $gte: start.setHours(0,0,0,0),
                $lte: end.setHours(23,59,59,999)
            };
        }

        if (supplierId) query.supplierId = supplierId;
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const grns = await GRN.find(query)
            .populate('supplierId', 'name phone')
            .populate('enteredBy', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(); // 🚀 Scalability: Lean query

        const total = await GRN.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: grns,
            pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getGRNById = async (req, res) => {
    try {
        const grn = await GRN.findOne({ _id: req.params.id, shopId: req.user.shopId })
            .populate('supplierId', 'name phone email address balance')
            .populate('enteredBy', 'name role')
            .populate('voidedBy', 'name role')
            .populate('items.productId', 'name barcode stock')
            .lean();

        if (!grn) return res.status(404).json({ success: false, error: 'Record not found' });
        return res.status(200).json({ success: true, data: grn });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Fetch failed' });
    }
};

/**
 * @desc    Void GRN and Audit the Stock Removal
 */
export const voidGRN = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shopId = req.user.shopId;
        const { voidReason } = req.body;

        const grn = await GRN.findOne({ _id: req.params.id, shopId }).session(session);
        if (!grn || grn.status === 'voided') throw new Error("GRN record invalid or already voided");
        if (!voidReason) throw new Error("Void reason is mandatory for audit trail");

        const stockMovements = [];
        const productOperations = [];

        for (const item of grn.items) {
            const product = await Product.findOne({ _id: item.productId, shopId }).session(session);
            if (!product) throw new Error(`Product '${item.name}' not found.`);

            // Safety Check: Don't allow void if stock was already sold
            if (product.stock < item.quantity) {
                throw new Error(`Cannot void. ${item.quantity - product.stock} units of '${item.name}' already sold.`);
            }

            productOperations.push({
                updateOne: {
                    filter: { _id: product._id, shopId },
                    update: { 
                        $inc: { stock: -item.quantity },
                        $set: { 
                            buyingPrice: item.previousUnitCost,
                            price: item.previousSellingPrice,
                            updatedBy: req.user._id
                        }
                    }
                }
            });

            stockMovements.push({
                shopId,
                productId: product._id,
                type: 'void_return',
                quantity: item.quantity,
                previousBalance: product.stock,
                balanceAfter: product.stock - item.quantity,
                referenceId: grn._id,
                onModel: 'GRN',
                userId: req.user._id,
                note: `VOID GRN: ${grn.grnNumber} - Stock Reversal`
            });
        }

        // Execute Batch Updates
        await Product.bulkWrite(productOperations, { session });
        await StockMovement.insertMany(stockMovements, { session });

        // Reverse Supplier Debt
        if (['Credit', 'Partial'].includes(grn.paymentType) && grn.balanceAmount > 0) {
            await Supplier.updateOne(
                { _id: grn.supplierId, shopId },
                { $inc: { balance: -grn.balanceAmount } },
                { session }
            );
        }

        grn.status = 'voided';
        grn.voidedBy = req.user._id;
        grn.voidedAt = new Date();
        grn.voidReason = voidReason;
        await grn.save({ session });

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({ success: true, message: "GRN voided and stock audited." });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, error: error.message });
    }
};