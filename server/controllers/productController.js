import Product from '../models/Product.js';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { PLAN_FEATURES, getEffectivePlan } from '../middleware/planMiddleware.js';

// FIX 3: Configure cloudinary — must be called before any cloudinary operations
// Uses same env vars as receiptUpload.js and existing cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const DEFAULT_IMAGE = 'https://via.placeholder.com/150'; // FIX 2: plain URL, no markdown

// ─── ADD PRODUCT ──────────────────────────────────────────────────────────────
export const addProduct = async (req, res) => {
    try {
        const { name, barcode, category, buyingPrice, price, stock, unit, minStockLevel, expiryDate } = req.body;
        const shopId = req.user.shopId;

        if (barcode) {
            const existing = await Product.findOne({ shopId, barcode });
            if (existing) {
                return res.status(400).json({ success: false, error: 'A product with this barcode already exists in your shop.' });
            }
        }

        // FIX 3: req.file.path works now because cloudinary is configured above
        const imageUrl = req.file ? req.file.path : DEFAULT_IMAGE; // FIX 2: correct URL

        const product = await Product.create({
            shopId, name,
            barcode: barcode || null,
            category, buyingPrice, price, stock, unit, minStockLevel, expiryDate,
            image: imageUrl,
            status: 'active',
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, data: product });
    } catch (error) {
        console.error("Add Product Error:", error);
        res.status(500).json({ success: false, error: 'Failed to add product.' });
    }
};

// ─── GET PRODUCTS ─────────────────────────────────────────────────────────────
export const getProducts = async (req, res) => {
    try {
        const page  = Math.max(parseInt(req.query.page)  || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const skip  = (page - 1) * limit;

        const products = await Product.find({ shopId: req.user.shopId, status: 'active' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Product.countDocuments({ shopId: req.user.shopId, status: 'active' });

        res.status(200).json({
            success: true,
            data: products,
            meta: { total, page, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error while fetching products.' });
    }
};

// ─── UPDATE PRODUCT ───────────────────────────────────────────────────────────
export const updateProduct = async (req, res) => {
    try {
        const { id }   = req.params;
        const shopId   = req.user.shopId;
        const updateData = { ...req.body, updatedBy: req.user._id };

        // FIX 3: req.file.path works because cloudinary is configured
        if (req.file) updateData.image = req.file.path;

        const existing = await Product.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        if (existing.shopId.toString() !== shopId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized to edit this product" });
        }

        const product = await Product.findOneAndUpdate(
            { _id: id, shopId },
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// ─── DELETE PRODUCT (Soft Delete) ────────────────────────────────────────────
export const deleteProduct = async (req, res) => {
    try {
        const { id }  = req.params;
        const shopId  = req.user.shopId;
        const product = await Product.findOne({ _id: id, shopId });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or unauthorized" });
        }

        if (product.image && product.image.includes('cloudinary')) {
            try {
                const urlParts = product.image.split('/');
                const publicId = urlParts.slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudErr) {
                console.error(`Cloudinary Delete Failed:`, cloudErr);
            }
        }

        product.status = 'archived';
        await product.save();

        res.status(200).json({ success: true, message: "Product archived successfully" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, error: "Server error during deletion" });
    }
};

// ─── BULK ARCHIVE ─────────────────────────────────────────────────────────────
export const bulkArchiveProducts = async (req, res) => {
    try {
        const shopId   = req.user.shopId;
        const products = await Product.find({ shopId, status: 'active' });

        if (products.length === 0) {
            return res.status(404).json({ success: false, message: "No active products to archive" });
        }

        for (const product of products) {
            if (product.image && product.image.includes('cloudinary')) {
                try {
                    const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error("Cloudinary bulk delete failed:", err);
                }
            }
        }

        await Product.updateMany(
            { shopId, status: 'active' },
            { $set: { status: 'archived', image: DEFAULT_IMAGE } } // FIX 2: correct URL
        );

        res.status(200).json({ success: true, message: `All ${products.length} products archived!` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ─── BULK UPLOAD ──────────────────────────────────────────────────────────────
// FIG 1 NOTE: Run this in MongoDB once to remove the old global unique index:
//   db.products.dropIndex("barcode_1")
// The old barcode_1 index conflicts with the new compound {shopId+barcode} index.
export const bulkUploadProducts = async (req, res) => {
    try {
        const { products } = req.body;
        const shopId = req.user.shopId;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or empty product list" });
        }

        // ━━━ 🛡️ SMART PLAN LIMIT CHECK (EXCEL SECURED) ━━━
        
        // 1. දැනට ඩේටාබේස් එකේ තියෙන ඇක්ටිව් (Archived නොවන) ප්‍රොඩක්ට්ස් ගාණ ගන්නවා
        const currentCount = await Product.countDocuments({ 
            $or: [{ shop: shopId }, { shopId: shopId }],
            status: { $ne: 'archived' }
        });

        const effectivePlan = await getEffectivePlan(shopId);
        const limit = PLAN_FEATURES[effectivePlan]?.maxProducts || 500;

        // ලිමිට් එක Infinity නොවේ නම් විතරක් චෙක් කරනවා
        if (limit !== Infinity) {
            
            // 2. Excel එකෙන් එන ඔක්කොම බාර්කෝඩ් ටික ක්ලීන් කරලා Array එකකට ගන්නවා
            const incomingBarcodes = products.map(rawProduct => {
                const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                    acc[key.toLowerCase().trim()] = rawProduct[key];
                    return acc;
                }, {});
                return cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;
            }).filter(Boolean);

            // 3. මේ බාර්කෝඩ් වලින් කීයක් දැනටමත් ඩේටාබේස් එකේ ඇක්ටිව්ව තියෙනවද බලනවා
            const existingProducts = await Product.find({
                $or: [{ shop: shopId }, { shopId: shopId }],
                barcode: { $in: incomingBarcodes },
                status: { $ne: 'archived' }
            }).select('barcode');

            const existingBarcodeSet = new Set(existingProducts.map(p => p.barcode));

            // 4. ඇත්තටම අලුතින්ම ඉන්සර්ට් (Insert) වෙන්න යන අයිටම්ස් ගාණ විතරක් ගණන් හදනවා (Updates අයින් කරලා)
            let newInsertsCount = 0;
            products.forEach(rawProduct => {
                const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                    acc[key.toLowerCase().trim()] = rawProduct[key];
                    return acc;
                }, {});
                const barcodeVal = cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;

                // බාර්කෝඩ් එකක් නැත්නම් හෝ ඒ බාර්කෝඩ් එක දැනට DB එකේ නැත්නම් ඒක අලුත් ප්‍රොඩක්ට් එකක්
                if (!barcodeVal || !existingBarcodeSet.has(barcodeVal)) {
                    newInsertsCount++;
                }
            });

            // 5. දැනට තියෙන ගාණ + අලුත් ගාණ එකතු කරලා ලිමිට් එක පනිනවද බලනවා
            if ((currentCount + newInsertsCount) > limit) {
                return res.status(403).json({
                    success: false,
                    error: `Bulk upload blocked. Your plan allows a maximum of ${limit} active products. ` +
                           `You currently have ${currentCount} active products. This Excel file contains ${newInsertsCount} new products, ` +
                           `which would exceed your plan limit by ${(currentCount + newInsertsCount) - limit} products. ` +
                           `Note: Updating existing barcodes is allowed, but adding new ones is blocked.`
                });
            }
        }

        // ━━━ 📑 ORIGINAL BULKWRITE OPERATIONS LOGIC (100% UNCHANGED) ━━━
        const operations = products.map(rawProduct => {
            const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                acc[key.toLowerCase().trim()] = rawProduct[key];
                return acc;
            }, {});

            const barcodeVal = cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;

            return {
                updateOne: {
                    filter: barcodeVal
                        ? { shopId, barcode: barcodeVal }
                        : { _id: new mongoose.Types.ObjectId() },
                    update: {
                        $set: {
                            shopId,
                            name:         cleanP['name']        || 'Unnamed Product',
                            barcode:      barcodeVal,
                            category:     cleanP['category']    || 'General',
                            buyingPrice:  Number(cleanP['buyingprice']) || 0,
                            price:        Number(cleanP['price'])       || 0,
                            stock:        Number(cleanP['stock'])       || 0,
                            image:        cleanP['image']       || DEFAULT_IMAGE,
                            status:       'active',
                            unit:         cleanP['unit']        || 'pcs'
                        }
                    },
                    upsert: true
                }
            };
        });

        const result = await Product.bulkWrite(operations, { ordered: false });

        res.status(200).json({
            success: true,
            message: `${products.length} products processed.`,
            inserted: result.upsertedCount,
            updated:  result.modifiedCount
        });

    } catch (error) {
        console.error("Bulk Upload Error:", error);

        if (error.code === 11000) {
            const dupKey = error.writeErrors?.[0]?.err?.keyValue;
            return res.status(400).json({
                success: false,
                error: `Duplicate barcode found: "${dupKey?.barcode || 'unknown'}". ` +
                       `Run this in MongoDB to fix: db.products.dropIndex("barcode_1")`
            });
        }

        res.status(500).json({ success: false, error: 'Bulk upload failed. Check server logs.' });
    }
};

// ─── EXPIRY ALERTS ────────────────────────────────────────────────────────────
export const getExpiryAlerts = async (req, res) => {
    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const expiringProducts = await Product.find({
            shopId:     req.user.shopId,
            status:     'active',
            expiryDate: { $lte: nextWeek, $ne: null }
        }).sort({ expiryDate: 1 }).lean();

        res.status(200).json({ success: true, data: expiringProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch expiry alerts.' });
    }
};

// ─── APPLY DISCOUNT ───────────────────────────────────────────────────────────
export const applyDiscount = async (req, res) => {
    try {
        const { id }         = req.params;
        const { percentage } = req.body;
        const shopId         = req.user.shopId;

        if (percentage === undefined || percentage < 0 || percentage > 100) {
            return res.status(400).json({ success: false, error: 'Invalid discount percentage.' });
        }

        const product = await Product.findOne({ _id: id, shopId });
        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found.' });
        }

        if (percentage === 0) {
            product.discount = { isActive: false, percentage: 0, discountedPrice: 0 };
            product.expiryDiscountApplied = false; // 💡 Reset state if discount is removed
        } else {
            const discountedPrice = Math.round(product.price - (product.price * (percentage / 100)));

            if (discountedPrice < product.buyingPrice) {
                return res.status(400).json({
                    success: false,
                    error: `Blocked: Discounted price (Rs.${discountedPrice}) is below buying cost (Rs.${product.buyingPrice}). Reduce the discount.`
                });
            }

            product.discount = { isActive: true, percentage, discountedPrice };
            product.expiryDiscountApplied = true; // 💡 Mark action as taken!
        }

        product.updatedBy = req.user._id;
        await product.save();
        res.status(200).json({ success: true, data: product });

    } catch (error) {
        console.error("Apply Discount Error:", error);
        res.status(500).json({ success: false, error: 'Server error while applying discount.' });
    }
};