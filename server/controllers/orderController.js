import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import StockMovement from '../models/StockMovement.js';

// -------------------------------------------------------------------------
// 1. CREATE ORDER
// -------------------------------------------------------------------------
export const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, paymentMethod, customerId, customerName, customerPhone } = req.body;
        const shopId = req.user.shopId;

        if (!items || items.length === 0) throw new Error("Cannot create an empty order");

        let totalAmount = 0;
        let totalProfit = 0;
        const processedItems = [];
        const stockMovements = [];

        const productIds = items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds }, shopId }).session(session);

        if (products.length !== items.length) throw new Error("Some products are invalid or unauthorized");

        const productOperations = [];

        for (const item of items) {
            const product = products.find(p => p._id.toString() === item.productId);

            if (product.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Current: ${product.stock}`);
            }

            // 🛡️ SECURITY: Always use server-side price — never trust client price
            let actualSellingPrice = product.price;
            if (product.discount?.isActive) {
                actualSellingPrice = product.discount.discountedPrice;
            }

            const itemProfit = (actualSellingPrice - product.buyingPrice) * item.quantity;
            totalProfit += itemProfit;
            totalAmount += actualSellingPrice * item.quantity;

            processedItems.push({
                productId: product._id,
                name: product.name,
                quantity: item.quantity,
                price: actualSellingPrice,
                buyingPrice: product.buyingPrice,
                subTotal: actualSellingPrice * item.quantity
            });

            productOperations.push({
                updateOne: {
                    filter: { _id: product._id, shopId, stock: { $gte: item.quantity } },
                    update: { $inc: { stock: -item.quantity } }
                }
            });

            // BUG 1 FIX: Only include fields that exist in StockMovement schema
            // Removed: previousBalance, onModel — not in schema, silently dropped by Mongoose
            stockMovements.push({
                shopId,
                productId: product._id,
                type: 'sale',
                quantity: item.quantity,
                balanceAfter: product.stock - item.quantity,
                userId: req.user._id,
                note: `Sale — ${product.name} (${item.quantity} units)`
            });
        }

        // Atomic stock deduction with concurrency protection
        const bulkResult = await Product.bulkWrite(productOperations, { session });
        if (bulkResult.modifiedCount !== items.length) {
            throw new Error("Concurrency conflict: stock changed during checkout. Please try again.");
        }

        // 🛡️ NAYA POTHA: Credit limit validation
        if (paymentMethod === 'Credit') {
            if (!customerId) throw new Error("Customer identity required for credit sales");

            const customer = await Customer.findOne({ _id: customerId, shopId }).session(session);
            if (!customer || customer.status !== 'active') throw new Error("Customer not found or inactive");

            if ((customer.creditBalance + totalAmount) > customer.creditLimit) {
                throw new Error(
                    `Credit limit exceeded. ` +
                    `Limit: Rs.${customer.creditLimit}, ` +
                    `Current debt: Rs.${customer.creditBalance}, ` +
                    `Available: Rs.${customer.creditLimit - customer.creditBalance}`
                );
            }

            customer.creditBalance += totalAmount;
            await customer.save({ session });
        }

        // BUG 2 FIX: Random suffix prevents duplicate billNumber on concurrent checkouts
        const billNumber = `INV-${shopId.toString().slice(-4).toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 900) + 100}`;

        const orderArray = await Order.create([{
            shopId,
            cashierId: req.user._id,
            customerId: customerId || null,
            customerName: customerName || 'Walk-in Customer',
            customerPhone: customerPhone || null,
            items: processedItems,
            totalAmount,
            totalProfit,
            paymentMethod,
            billNumber
        }], { session });

        const newOrder = orderArray[0];

        // Link StockMovement records to order
        const finalMovements = stockMovements.map(m => ({ ...m, referenceId: newOrder._id }));
        await StockMovement.insertMany(finalMovements, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: newOrder });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, error: error.message });
    }
};

// -------------------------------------------------------------------------
// 2. GET SALES HISTORY
// -------------------------------------------------------------------------
export const getSalesHistory = async (req, res) => {
    try {
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        let query = { shopId: req.user.shopId };

        if (startDate) {
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date(startDate);
            query.createdAt = {
                $gte: start,
                $lte: new Date(end.setHours(23, 59, 59, 999))
            };
        }

        // IMPROVEMENT 1 FIX: Cap limit at 100 — prevent DB dump via ?limit=100000
        const safeLimit = Math.min(parseInt(limit) || 50, 100);
        const skip = (Math.max(parseInt(page), 1) - 1) * safeLimit;

        const orders = await Order.find(query)
            .populate('cashierId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean();

        const total = await Order.countDocuments(query);

        // 3-tier RBAC sanitization
        const sanitizedOrders = orders.map(order => {
            const o = { ...order };
            // Cashier: loses profit visibility entirely
            if (req.user.role === 'cashier') {
                delete o.totalProfit;
            }
            // Cashier + Manager: cannot see individual item cost prices
            if (req.user.role !== 'admin' && req.user.role !== 'owner') {
                o.items = o.items.map(item => {
                    const i = { ...item };
                    delete i.buyingPrice;
                    return i;
                });
            }
            return o;
        });

        res.status(200).json({
            success: true,
            data: sanitizedOrders,
            meta: { total, page: parseInt(page), pages: Math.ceil(total / safeLimit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch sales history' });
    }
};

// -------------------------------------------------------------------------
// 3. VOID ORDER
// -------------------------------------------------------------------------
export const voidOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shopId = req.user.shopId;

        // IMPROVEMENT 2 FIX: voidReason required — consistent with GRN void + audit trail
        const { voidReason } = req.body;
        if (!voidReason || voidReason.trim() === '') {
            throw new Error("Void reason is required");
        }

        const order = await Order.findOne({ _id: req.params.id, shopId }).session(session);
        if (!order) throw new Error("Order not found");
        if (order.status === 'voided') throw new Error("Order is already voided");

        const stockOperations = [];
        const stockMovements = [];

        for (const item of order.items) {
            const product = await Product.findById(item.productId).session(session);

            stockOperations.push({
                updateOne: {
                    filter: { _id: item.productId, shopId },
                    update: { $inc: { stock: item.quantity } }
                }
            });

            // BUG 1 FIX: Only schema-valid fields — removed previousBalance + onModel
            stockMovements.push({
                shopId,
                productId: item.productId,
                type: 'void_return',
                quantity: item.quantity,
                balanceAfter: (product ? product.stock : 0) + item.quantity,
                userId: req.user._id,
                referenceId: order._id,
                note: `Order voided: ${order.billNumber} — Reason: ${voidReason}`
            });
        }

        if (stockOperations.length > 0) {
            await Product.bulkWrite(stockOperations, { session });
            await StockMovement.insertMany(stockMovements, { session });
        }

        // 🛡️ NAYA POTHA: Reverse credit if it was a credit sale
        if (order.paymentMethod === 'Credit' && order.customerId) {
            const customer = await Customer.findOne({ _id: order.customerId, shopId }).session(session);
            if (customer) {
                customer.creditBalance = Math.max(0, customer.creditBalance - order.totalAmount);
                await customer.save({ session });
            }
        }

        order.status = 'voided';
        order.voidedAt = new Date();
        order.voidedBy = req.user._id;
        order.voidReason = voidReason;
        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: "Order voided and stock restored." });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, error: error.message });
    }
};