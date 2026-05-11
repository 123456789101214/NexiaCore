import mongoose from 'mongoose'; // Transaction වලට අනිවාර්යයි
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';

export const createGRN = async (req, res) => {
// 💡 PRO FIX 1: ACID Transaction එකක් පටන් ගැනීම
const session = await mongoose.startSession();
session.startTransaction();

try {
    const { supplierId, invoiceNumber, items, totalAmount, paidAmount, paymentType } = req.body;
    const shopId = req.user.shopId; // ✅ Fixed wrong ID
    const processedBy = req.user._id;

    // Validation
    if (!items || items.length === 0) {
        throw new Error("No items found in GRN");
    }
    if (paidAmount > totalAmount) {
        throw new Error("Paid amount cannot be greater than total amount");
    }

    const balanceAmount = totalAmount - paidAmount;

    // 1. පර්චස් එක සේව් කිරීම (Transaction session එක ඇතුළේ)
    const newPurchase = new Purchase({
        shopId, supplierId, processedBy, invoiceNumber, items, totalAmount, paidAmount, balanceAmount, paymentType
    });
    await newPurchase.save({ session }); // 💡 Session parameter එක අනිවාර්යයි

    // 2. හැම අයිටම් එකකම Stock සහ Price අප්ඩේට් කිරීම (BulkWrite for Performance)
    // 💡 PRO FIX 2: map + Promise.all වෙනුවට BulkWrite පාවිච්චි කරනවා
    const productOperations = items.map(item => ({
        updateOne: {
            // 💡 PRO FIX 3: Tenant Security - shopId එක අනිවාර්යයෙන්ම බලනවා!
            filter: { _id: item.productId, shopId: shopId },
            update: {
                $inc: { stock: item.quantity }, // Stock එකතු කරනවා
                $set: { 
                    buyingPrice: item.buyingPrice, 
                    price: item.sellingPrice,
                    ...(item.expiryDate && { expiryDate: item.expiryDate }) // expiry date එක තියෙනවා නම් විතරක් සෙට් කරනවා
                }
            }
        }
    }));

    const bulkResult = await Product.bulkWrite(productOperations, { session });
    
    if (bulkResult.matchedCount !== items.length) {
        // මොකක් හරි අයිටම් එකක් වෙන කඩේකට අයිති එකක් නම් හරි, මැකිලා නම් හරි
        throw new Error("Some products are invalid or unauthorized");
    }

    // 3. සප්ලයර්ගේ ණය (Balance) අප්ඩේට් කිරීම
    if (balanceAmount > 0) {
        const updatedSupplier = await Supplier.findOneAndUpdate(
            { _id: supplierId, shopId: shopId }, // 💡 Tenant Security!
            { $inc: { balance: balanceAmount } },
            { new: true, session }
        );

        if (!updatedSupplier) {
            throw new Error("Supplier not found or unauthorized");
        }
    }

    // 💡 ඔක්කොම හරි ගියා නම්, Transaction එක Commit කරලා ඩේටාබේස් එකට ස්ථිරවම ලියනවා
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: "GRN Processed and Stock Updated Successfully!" });

} catch (error) {
    // 💡 මොකක් හරි එක පොඩි දෙයක් හරි වැරදුනොත්, කරපු ඔක්කොම වෙනස්කම් ආපහු හරවනවා (Rollback)
    await session.abortTransaction();
    session.endSession();
    
    console.error("GRN Processing Error:", error);
    res.status(400).json({ success: false, error: error.message || 'GRN Processing Failed' });
}
};