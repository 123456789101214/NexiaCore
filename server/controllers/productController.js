import Product from '../models/Product.js';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import { PLAN_FEATURES, getEffectivePlan } from '../middleware/planMiddleware.js';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import Category from '../models/Category.js';

// FIX 3: Configure cloudinary — must be called before any cloudinary operations
// Uses same env vars as receiptUpload.js and existing cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const DEFAULT_IMAGE = 'https://via.placeholder.com/150'; // FIX 2: plain URL, no markdown

// ─── ADD PRODUCT ──────────────────────────────────────────────────────────────
export const addProduct = async (req, res) => {
    try {
        // 💡 1. 'imageUrl' එකත් req.body එකෙන් ගන්නවා (AI එකෙන් එවන String URL එක)
        const { name, barcode, category, buyingPrice, price, stock, unit, minStockLevel, expiryDate, imageUrl } = req.body;
        const shopId = req.user.shopId;

        // 💡 2. IMAGE FIX: Multer එකෙන් ආපු ෆයිල් එකක් තියෙනවද බලනවා. නැත්නම් AI URL එක ගන්නවා. දෙකම නැත්නම් Default එක.
        const DEFAULT_IMAGE = 'https://placehold.co/150?text=No+Image';
        const finalImageUrl = req.file ? req.file.path : (imageUrl || DEFAULT_IMAGE);

        // 💡 3. ARCHIVED PRODUCT FIX: Barcode එක දැනටමත් තියෙනවද බලනවා
        if (barcode) {
            const existing = await Product.findOne({ shopId, barcode });
            if (existing) {
                if (existing.status === 'archived') {
                    // Archive කරපු එකක් නම්, අලුතින් හදන්නේ නැතුව ඒකම යාවත්කාලීන (Update) කරලා Active කරනවා ♻️
                    existing.name = name;
                    existing.category = category || 'General';
                    existing.buyingPrice = buyingPrice;
                    existing.price = price;
                    existing.stock = stock;
                    existing.unit = unit || 'pcs';
                    existing.minStockLevel = minStockLevel;
                    existing.expiryDate = expiryDate;
                    existing.image = finalImageUrl;
                    existing.status = 'active'; // 👈 ආපහු Active කරනවා

                    await existing.save();
                    return res.status(200).json({ success: true, data: existing, message: 'Archived product restored successfully!' });
                } else {
                    // ඇත්තටම Active බඩුවක් තියෙනවා නම් Error එකක් දෙනවා
                    return res.status(400).json({ success: false, error: 'A product with this barcode already exists in your shop.' });
                }
            }
        }

        // 4. අලුත්ම බඩුවක් නම් සාමාන්‍ය විදිහට Create කරනවා
        const product = await Product.create({
            shopId, name,
            barcode: barcode || null,
            category, buyingPrice, price, stock, unit, minStockLevel, expiryDate,
            image: finalImageUrl, // 👈 හරියටම ගලපපු Image එක මෙතනින් සේව් වෙනවා
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
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const skip = (page - 1) * limit;

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
        const { id } = req.params;
        const shopId = req.user.shopId;
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
        const { id } = req.params;
        const shopId = req.user.shopId;
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
        const shopId = req.user.shopId;
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
                            name: cleanP['name'] || 'Unnamed Product',
                            barcode: barcodeVal,
                            category: cleanP['category'] || 'General',
                            buyingPrice: Number(cleanP['buyingprice']) || 0,
                            price: Number(cleanP['price']) || 0,
                            stock: Number(cleanP['stock']) || 0,
                            image: cleanP['image'] || DEFAULT_IMAGE,
                            status: 'active',
                            unit: cleanP['unit'] || 'pcs'
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
            updated: result.modifiedCount
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

// Cloudinary Stream Helper (මෙතනින් තමයි ZIP එකේ තියෙන ෆොටෝ කෙලින්ම Cloud එකට යන්නේ)
const uploadBufferToCloudinary = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'nexiacore_products', public_id: filename.split('.')[0] },
            (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
            }
        );
        Readable.from(buffer).pipe(uploadStream);
    });
};

export const bulkUploadWithImages = async (req, res) => {
    try {
        if (!req.files || !req.files.excel) {
            return res.status(400).json({ success: false, message: "Excel file is required" });
        }

        const shopId = req.user.shopId;
        const updatedBy = req.user._id;

        // 1. Parse Excel from Buffer
        const workbook = xlsx.read(req.files.excel[0].buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const products = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!products || products.length === 0) {
            return res.status(400).json({ success: false, message: "Excel file is empty" });
        }

        // ━━━ 🛡️ SMART PLAN LIMIT CHECK (ඔයාගේ පරණ ලොජික් එක එහෙම්මම) ━━━
        const currentCount = await Product.countDocuments({
            $or: [{ shop: shopId }, { shopId: shopId }],
            status: { $ne: 'archived' }
        });

        // getEffectivePlan function එක උඩින් import කරලා තියෙන්න ඕනේ
        const effectivePlan = await getEffectivePlan(shopId);
        const limit = PLAN_FEATURES[effectivePlan]?.maxProducts || 500;

        if (limit !== Infinity) {
            const incomingBarcodes = products.map(rawProduct => {
                const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                    acc[key.toLowerCase().trim()] = rawProduct[key];
                    return acc;
                }, {});
                return cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;
            }).filter(Boolean);

            const existingProducts = await Product.find({
                $or: [{ shop: shopId }, { shopId: shopId }],
                barcode: { $in: incomingBarcodes },
                status: { $ne: 'archived' }
            }).select('barcode');

            const existingBarcodeSet = new Set(existingProducts.map(p => p.barcode));

            let newInsertsCount = 0;
            products.forEach(rawProduct => {
                const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                    acc[key.toLowerCase().trim()] = rawProduct[key];
                    return acc;
                }, {});
                const barcodeVal = cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;

                if (!barcodeVal || !existingBarcodeSet.has(barcodeVal)) {
                    newInsertsCount++;
                }
            });

            if ((currentCount + newInsertsCount) > limit) {
                return res.status(403).json({
                    success: false,
                    error: `Bulk upload blocked. Your plan allows max ${limit} active products. You have ${currentCount}. Excel contains ${newInsertsCount} new items.`
                });
            }
        }

        // ━━━ 🖼️ PROCESS ZIP IMAGES ━━━
        const imageMap = {};
        if (req.files.images) {
            try {
                const zip = new AdmZip(req.files.images[0].buffer);
                const zipEntries = zip.getEntries();
                zipEntries.forEach((entry) => {
                    if (!entry.isDirectory && !entry.entryName.includes('__MACOSX') && !entry.entryName.includes('.DS_Store')) {
                        const ext = entry.entryName.split('.').pop().toLowerCase();
                        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                            const fileName = entry.entryName.split('/').pop();
                            imageMap[fileName] = entry.getData();
                        }
                    }
                });
            } catch (error) {
                return res.status(400).json({ success: false, message: "Invalid ZIP format" });
            }
        }

        // ━━━ 🏷️ DYNAMIC CATEGORY SYNC ━━━
        // 1. Excel එකෙන් එන ඔක්කොම Categories වලින් Unique ඒවා විතරක් පෙරලා ගන්නවා
        const uniqueCategories = [...new Set(products.map(rawProduct => {
            const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                acc[key.toLowerCase().trim()] = rawProduct[key];
                return acc;
            }, {});
            return cleanP['category'] ? String(cleanP['category']).trim() : 'General';
        }))];

        try {
            // 2. දැනට DB එකේ මේ Shop එකට අදාළව තියෙන Categories ටික අරගන්නවා
            const existingCategories = await Category.find({ shopId }).select('name');
            const existingCategoryNames = new Set(existingCategories.map(c => c.name.toLowerCase()));

            // 3. දැනට නැති, අලුතෙන්ම ආපු Categories ටික වෙනම අරගන්නවා
            const newCategoriesToInsert = uniqueCategories
                .filter(cat => !existingCategoryNames.has(cat.toLowerCase()))
                .map(cat => ({
                    shopId,
                    name: cat,
                    status: 'active',
                    createdBy: updatedBy
                }));

            // 4. අලුත් ඒවා තියෙනවා නම් විතරක් එකපාර DB එකට Insert කරනවා (ordered: false නිසා Crash වෙන්නේ නෑ)
            if (newCategoriesToInsert.length > 0) {
                await Category.insertMany(newCategoriesToInsert, { ordered: false });
                console.log(`✅ ${newCategoriesToInsert.length} new categories dynamically synced!`);
            }
        } catch (catError) {
            // ⚠️ Exception Handling: Category Sync එකේ මොනවා හරි අවුලක් ගියත් Product Upload එක නවතින්නේ නෑ!
            console.warn("⚠️ Category sync issue (Skipping to products):", catError.message);
        }

        // ━━━ 📑 BULK WRITE OPERATIONS ━━━
        const operations = [];
        const errorRows = [];
        let uploadedImageCount = 0;

        for (let i = 0; i < products.length; i++) {
            const rawProduct = products[i];
            const cleanP = Object.keys(rawProduct).reduce((acc, key) => {
                acc[key.toLowerCase().trim()] = rawProduct[key];
                return acc;
            }, {});

            if (!cleanP['name'] || cleanP['price'] === undefined) {
                errorRows.push({ row: i + 2, name: cleanP['name'] || 'Unknown', reason: 'Missing name or price' });
                continue;
            }

            // ━━━ 🖼️ SMART IMAGE MATCHING ENGINE ━━━
            let imageUrl = cleanP['image'] || 'https://placehold.co/150?text=No+Image';
            let matchedBuffer = null;
            let matchedFileName = null;

            // 1. Exact Match (Excel එකේ නම දීලා තියෙනවා නම්)
            const exactImgName = cleanP['imagefilename'];

            // 2. Barcode Match (බාර්කෝඩ් එකෙන් ෆොටෝ එක නම් කරලා නම් - 479123.jpg)
            const barcodeVal = cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;
            const barcodeJpg = barcodeVal ? `${barcodeVal}.jpg` : null;
            const barcodePng = barcodeVal ? `${barcodeVal}.png` : null;

            // 3. SKU Match (SKU-1001.jpg)
            const skuVal = cleanP['sku'] ? String(cleanP['sku']).trim() : null;
            const skuJpg = skuVal ? `${skuVal}.jpg` : null;
            const skuPng = skuVal ? `${skuVal}.png` : null;

            // 4. Normalized Name Match (coca-cola.jpg == Coca Cola)
            const normalizedProductName = cleanP['name']
                ? cleanP['name'].toLowerCase().replace(/[^a-z0-9]/g, '')
                : null;

            // Smart Search Logic
            if (exactImgName && imageMap[exactImgName]) {
                matchedBuffer = imageMap[exactImgName];
                matchedFileName = exactImgName;
            } else if (barcodeVal && imageMap[barcodeJpg]) {
                matchedBuffer = imageMap[barcodeJpg];
                matchedFileName = barcodeJpg;
            } else if (barcodeVal && imageMap[barcodePng]) {
                matchedBuffer = imageMap[barcodePng];
                matchedFileName = barcodePng;
            } else if (skuVal && imageMap[skuJpg]) {
                matchedBuffer = imageMap[skuJpg];
                matchedFileName = skuJpg;
            } else if (skuVal && imageMap[skuPng]) {
                matchedBuffer = imageMap[skuPng];
                matchedFileName = skuPng;
            } else if (normalizedProductName) {
                // Fuzzy Name Match: Check if any file in ZIP matches the normalized name
                const zipFileNames = Object.keys(imageMap);
                const fuzzyMatch = zipFileNames.find(file => {
                    const normalizedFile = file.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                    return normalizedFile === normalizedProductName;
                });

                if (fuzzyMatch) {
                    matchedBuffer = imageMap[fuzzyMatch];
                    matchedFileName = fuzzyMatch;
                }
            }

            // අදාළ ෆොටෝ එකක් හම්බුණොත් Cloudinary යවනවා
            if (matchedBuffer) {
                try {
                    imageUrl = await uploadBufferToCloudinary(matchedBuffer, matchedFileName);
                    uploadedImageCount++;
                    // Memory එක ඉතුරු කරන්න අප්ලෝඩ් වුණු එක Map එකෙන් අයින් කරනවා
                    delete imageMap[matchedFileName];
                } catch (imgError) {
                    console.error(`Failed to upload ${matchedFileName}`);
                }
            }

            // const barcodeVal = cleanP['barcode'] ? String(cleanP['barcode']).trim() : null;
            const filter = barcodeVal
                ? { shopId, barcode: barcodeVal }
                : { _id: new mongoose.Types.ObjectId() };

            operations.push({
                updateOne: {
                    filter,
                    update: {
                        $set: {
                            shopId,
                            name: cleanP['name'],
                            barcode: barcodeVal,
                            sku: cleanP['sku'] ? String(cleanP['sku']) : undefined,
                            category: cleanP['category'] || 'General',
                            buyingPrice: Number(cleanP['buyingprice']) || 0,
                            price: Number(cleanP['price']) || 0,
                            stock: Number(cleanP['stock']) || 0,
                            minStockLevel: Number(cleanP['minstocklevel']) || 5,
                            image: imageUrl,
                            status: 'active',
                            unit: cleanP['unit'] || 'pcs',
                            updatedBy
                        }
                    },
                    upsert: true
                }
            });
        }

        const result = await Product.bulkWrite(operations, { ordered: false });

        res.status(200).json({
            success: true,
            message: `${operations.length} products processed.`,
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
            imagesUploaded: uploadedImageCount,
            errors: errorRows
        });

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Duplicate barcode found." });
        }
        res.status(500).json({ success: false, error: 'Upload failed. Check server logs.' });
    }
};

// ─── EXPIRY ALERTS ────────────────────────────────────────────────────────────
export const getExpiryAlerts = async (req, res) => {
    try {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const expiringProducts = await Product.find({
            shopId: req.user.shopId,
            status: 'active',
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
        const { id } = req.params;
        const { percentage } = req.body;
        const shopId = req.user.shopId;

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

// =========================================================================
// 🔍 SMART BARCODE LOOKUP (OPEN FOOD FACTS API)
// =========================================================================
export const lookupBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        const shopId = req.user.shopId;

        // 1. Validate barcode (Basic check for 8-14 digit formats like EAN-8, EAN-13, UPC)
        const cleanBarcode = barcode?.trim().replace(/\D/g, '');
        if (!cleanBarcode || cleanBarcode.length < 8 || cleanBarcode.length > 14) {
            return res.status(400).json({ success: false, message: "Invalid barcode format" });
        }

        // 2. Check if already exists in THIS shop's inventory
        const existing = await Product.findOne({
            shopId: shopId,
            barcode: cleanBarcode
        }).select('name category price image status');

        if (existing && existing.status === 'active') {
            return res.status(200).json({
                success: true,
                source: 'existing',
                alreadyExists: true,
                product: { name: existing.name, category: existing.category },
                message: 'This product already exists in your inventory'
            });
        }

        // 3. Fetch from Open Food Facts API
        const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`;
        let offData = null;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'NexiaCore-POS/1.0 (nexiacore.lk contact@nexiacore.lk)'
                }
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (data.status === 1 && data.product) {
                offData = data.product;
            }
        } catch (fetchError) {
            console.log(`OFF API timeout or error for barcode: ${cleanBarcode}`);
        }

        // 4. Parse and normalize the response if found
        if (offData) {
            const rawName = offData.product_name || offData.product_name_en || offData.product_name_fr || null;
            const brand = offData.brands?.split(',')[0]?.trim() || null;

            let displayName = rawName || '';
            if (brand && rawName && !rawName.toLowerCase().includes(brand.toLowerCase())) {
                displayName = `${brand} ${rawName}`;
            }
            if (offData.quantity) {
                displayName = `${displayName} ${offData.quantity}`.trim();
            }

            // =========================================================================
            // 👑 NEXIACORE GLOBAL CATEGORY MAPPING ENGINE (SRI LANKAN MARKET)
            // =========================================================================
            const categoryMap = {
                // 🛒 1. SUPERMARKET & GROCERY
                'instant-noodles': 'Instant Food', 'noodles': 'Instant Food', 'pasta': 'Instant Food', 'macaroni': 'Instant Food',
                'biscuits': 'Snacks & Biscuits', 'chocolates': 'Snacks & Biscuits', 'snacks': 'Snacks & Biscuits', 'chips': 'Snacks & Biscuits', 'candy': 'Snacks & Biscuits', 'sweets': 'Snacks & Biscuits',
                'beverages': 'Beverages', 'soft-drinks': 'Beverages', 'juices': 'Beverages', 'waters': 'Beverages', 'energy-drinks': 'Beverages', 'cordials': 'Beverages',
                'coffees': 'Tea & Coffee', 'teas': 'Tea & Coffee',
                'milk': 'Dairy & Eggs', 'dairy': 'Dairy & Eggs', 'cheeses': 'Dairy & Eggs', 'yogurts': 'Dairy & Eggs', 'butter': 'Dairy & Eggs', 'margarine': 'Dairy & Eggs',
                'rice': 'Rice & Grains', 'cereals': 'Rice & Grains', 'grains': 'Rice & Grains', 'dhal': 'Rice & Grains', 'lentils': 'Rice & Grains',
                'flour': 'Baking & Cooking', 'baking': 'Baking & Cooking', 'sugar': 'Baking & Cooking',
                'breads': 'Bakery', 'cakes': 'Bakery', 'pastries': 'Bakery', 'buns': 'Bakery',
                'soaps': 'Personal Care', 'toothpastes': 'Personal Care', 'shampoos': 'Personal Care', 'cosmetics': 'Personal Care', 'deodorants': 'Personal Care', 'hair-care': 'Personal Care', 'perfumes': 'Personal Care',
                'detergents': 'Household & Cleaning', 'cleaning': 'Household & Cleaning', 'dishwashing': 'Household & Cleaning', 'air-fresheners': 'Household & Cleaning', 'tissues': 'Household & Cleaning',
                'baby-foods': 'Baby Products', 'diapers': 'Baby Products', 'baby-care': 'Baby Products',
                'cooking-oils': 'Condiments & Spices', 'condiments': 'Condiments & Spices', 'spices': 'Condiments & Spices', 'sauces': 'Condiments & Spices', 'salt': 'Condiments & Spices', 'vinegar': 'Condiments & Spices',
                'frozen': 'Frozen Foods', 'ice-cream': 'Frozen Foods', 'frozen-meat': 'Frozen Foods',
                'meat': 'Meat & Fish', 'fish': 'Meat & Fish', 'seafood': 'Meat & Fish', 'poultry': 'Meat & Fish', 'chicken': 'Meat & Fish',
                'canned': 'Canned Foods', 'preserves': 'Canned Foods', 'jam': 'Canned Foods',
                'pet-food': 'Pet Care', 'dog-food': 'Pet Care', 'cat-food': 'Pet Care',
                'fruits': 'Fruits & Vegetables', 'vegetables': 'Fruits & Vegetables',

                // 💊 2. PHARMACY & HEALTHCARE
                'medicines': 'OTC Medicines', 'painkillers': 'OTC Medicines', 'syrup': 'OTC Medicines', 'tablets': 'OTC Medicines', 'capsules': 'OTC Medicines',
                'vitamins': 'Vitamins & Supplements', 'supplements': 'Vitamins & Supplements', 'protein': 'Vitamins & Supplements', 'nutrition': 'Vitamins & Supplements',
                'first-aid': 'First Aid', 'bandages': 'First Aid', 'plasters': 'First Aid', 'antiseptic': 'First Aid',
                'medical-devices': 'Medical Devices', 'thermometers': 'Medical Devices', 'meters': 'Medical Devices',
                'skincare': 'Skincare & Dermatology', 'sunscreen': 'Skincare & Dermatology', 'lotion': 'Skincare & Dermatology', 'ointments': 'Skincare & Dermatology',

                // 💻 3. ELECTRONICS & IT
                'mobile': 'Mobile Phones & Tabs', 'phone': 'Mobile Phones & Tabs', 'tablet': 'Mobile Phones & Tabs', 'smartphone': 'Mobile Phones & Tabs',
                'laptop': 'Computers & Laptops', 'computer': 'Computers & Laptops', 'desktop': 'Computers & Laptops',
                'accessories': 'Tech Accessories', 'charger': 'Tech Accessories', 'cable': 'Tech Accessories', 'earphones': 'Tech Accessories', 'headphones': 'Tech Accessories', 'powerbank': 'Tech Accessories', 'pendrive': 'Tech Accessories',
                'appliance': 'Home Appliances', 'tv': 'Home Appliances', 'television': 'Home Appliances', 'fridge': 'Home Appliances', 'fan': 'Home Appliances', 'blender': 'Home Appliances', 'washing-machine': 'Home Appliances',
                'audio': 'Audio & Video', 'speaker': 'Audio & Video',
                'gaming': 'Gaming', 'console': 'Gaming',
                'networking': 'Networking', 'router': 'Networking',

                // 👗 4. CLOTHING & FASHION
                'mens-wear': 'Men\'s Wear', 'shirt': 'Men\'s Wear', 't-shirt': 'Men\'s Wear', 'trousers': 'Men\'s Wear', 'denim': 'Men\'s Wear',
                'womens-wear': 'Women\'s Wear', 'dress': 'Women\'s Wear', 'skirt': 'Women\'s Wear', 'saree': 'Women\'s Wear', 'blouse': 'Women\'s Wear',
                'kids-wear': 'Kids\' Wear', 'baby-clothes': 'Kids\' Wear',
                'shoes': 'Footwear', 'footwear': 'Footwear', 'slippers': 'Footwear', 'sneakers': 'Footwear', 'sandals': 'Footwear',
                'bags': 'Bags & Wallets', 'wallet': 'Bags & Wallets', 'backpack': 'Bags & Wallets',
                'jewelry': 'Jewelry & Watches', 'watch': 'Jewelry & Watches',
                'activewear': 'Activewear', 'gym-wear': 'Activewear',

                // 🍔 5. RESTAURANT & CAFE (For Excel imports / POS Menus)
                'appetizers': 'Appetizers', 'snacks-food': 'Appetizers',
                'main-course': 'Main Course', 'rice-curry': 'Main Course', 'fried-rice': 'Main Course', 'kottu': 'Main Course', 'noodles-dish': 'Main Course',
                'fast-food': 'Fast Food', 'burger': 'Fast Food', 'pizza': 'Fast Food', 'sandwiches': 'Fast Food', 'submarine': 'Fast Food',
                'desserts': 'Desserts', 'pudding': 'Desserts', 'watalappan': 'Desserts',
                'hot-beverage': 'Hot Beverages', 'coffee-drink': 'Hot Beverages', 'tea-drink': 'Hot Beverages',
                'cold-beverage': 'Cold Beverages', 'mocktails': 'Cold Beverages', 'milkshake': 'Cold Beverages'
            };

            let mappedCategory = 'General';
            const tags = offData.categories_tags || [];
            for (const tag of tags) {
                const key = tag.replace('en:', '').toLowerCase();
                for (const [pattern, category] of Object.entries(categoryMap)) {
                    if (key.includes(pattern)) {
                        mappedCategory = category;
                        break;
                    }
                }
                if (mappedCategory !== 'General') break;
            }

            const imageUrl = offData.image_front_small_url || offData.image_front_url || null;

            return res.status(200).json({
                success: true,
                source: 'openfoodfacts',
                alreadyExists: false,
                product: {
                    name: displayName || `Product ${cleanBarcode}`,
                    brand: brand || '',
                    category: mappedCategory,
                    image: imageUrl,
                    barcode: cleanBarcode,
                    quantity: offData.quantity || ''
                },
                message: 'Product found'
            });
        }

        // 5. Not found in database
        return res.status(200).json({
            success: true,
            source: 'not_found',
            alreadyExists: false,
            product: {
                name: '', brand: '', category: 'General', image: null, barcode: cleanBarcode
            },
            message: 'Product not found in database. Please enter details manually.'
        });

    } catch (error) {
        console.error("Barcode Lookup Error:", error);
        res.status(500).json({ success: false, message: 'Server error during lookup' });
    }
};

// =========================================================================
// 🛠️ INTERNAL HELPERS FOR GOOGLE DRIVE URL CONVERSION & UPLOAD
// =========================================================================

const convertToDirectUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();

    // Google Drive: /file/d/FILE_ID/view → uc?export=download&id=FILE_ID
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    // Google Drive open format: open?id=FILE_ID
    const driveOpen = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpen) {
        return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}`;
    }

    // Dropbox: dl=0 → dl=1
    if (trimmed.includes('dropbox.com')) {
        return trimmed.replace('dl=0', 'dl=1').replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return null;
};

const downloadAndUploadToCloudinary = (url, productName, shopId) => {
    return new Promise((resolve) => {
        try {
            const directUrl = convertToDirectUrl(url);
            if (!directUrl) { resolve(null); return; }

            cloudinary.uploader.upload(directUrl, {
                folder: `nexiacore_products/${shopId}`,
                public_id: `${Date.now()}_${productName.replace(/\s+/g, '_').slice(0, 30)}`,
                resource_type: 'image',
                timeout: 20000, // 20 second timeout per image
                transformation: [
                    { width: 500, height: 500, crop: 'limit' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            }, (error, result) => {
                if (error) {
                    console.warn(`[Cloudinary] Upload failed for "${productName}":`, error.message);
                    resolve(null); // Fail gracefully, keep uploading others
                } else {
                    resolve(result.secure_url);
                }
            });
        } catch (error) {
            console.warn(`[Image Fetch] Failed for "${productName}":`, error.message);
            resolve(null);
        }
    });
};

// =========================================================================
// 🚀 MAIN EXCEL BULK UPLOAD CONTROLLER
// =========================================================================

export const bulkUploadFromExcel = async (req, res) => {
    try {
        // STEP 1: Validate file
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, error: "Please upload an Excel file (.xlsx or .csv)" });
        }

        // STEP 2: Parse Excel
        let rawRows = [];
        try {
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        } catch (error) {
            // 💡 මේ පේළිය දැම්මම Terminal එකේ ඇත්තම Error එක පෙනෙනවා
            console.error("Excel Parse Error:", error);
            return res.status(400).json({ success: false, error: "Invalid Excel file format. Please use the exact template provided." });
        }

        if (rawRows.length === 0) return res.status(400).json({ success: false, error: "Excel file is empty." });
        if (rawRows.length > 1000) return res.status(400).json({ success: false, error: "Max 1000 products per upload." });

        // STEP 3: Normalize columns
        const rows = rawRows.map(row => {
            const n = {};
            for (const [key, val] of Object.entries(row)) {
                n[key.toLowerCase().trim().replace(/\s+/g, '')] = val;
            }
            return n;
        });

        // 👑 NEW ARCHITECT LOGIC: Database එකේ දැනට තියෙන බඩු වල නම් ටිකයි Barcodes ටිකයි කලින්ම ගන්නවා
        const existingProducts = await Product.find({ shopId: req.user.shopId }).select('name barcode');
        const nameToBarcodeMap = new Map();
        existingProducts.forEach(p => {
            if (p.name && p.barcode) {
                nameToBarcodeMap.set(p.name.toLowerCase().trim(), p.barcode);
            }
        });

        // STEP 4: Validate rows & Auto-generate Barcodes
        const validRows = [];
        const errorRows = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            if (!row.name || String(row.name).trim().length < 2) {
                errorRows.push({ row: rowNum, name: row.name || '(empty)', error: 'Name is required' });
                continue;
            }

            const price = parseFloat(row.price);
            if (isNaN(price) || price <= 0) {
                errorRows.push({ row: rowNum, name: row.name, error: 'Valid selling price required' });
                continue;
            }

            const buyingPrice = parseFloat(row.buyingprice || row['buyingprice'] || 0);

            // 👑 Architect's Touch: Smarter Barcode Generation
            let finalBarcode = row.barcode ? String(row.barcode).trim() : null;

            if (!finalBarcode) {
                const cleanName = String(row.name).trim().toLowerCase();

                // 1. මේ නමින්ම බඩුවක් කලින් ඇඩ් වෙලා තියෙනවද කියලා බලනවා
                if (nameToBarcodeMap.has(cleanName)) {
                    // තියෙනවා නම්, ඒ පරණ Barcode එකම පාවිච්චි කරනවා (එතකොට අලුතින් ඇඩ් වෙන්නේ නෑ, Update වෙනවා)
                    finalBarcode = nameToBarcodeMap.get(cleanName);
                } else {
                    // 2. ඇත්තටම අලුත් බඩුවක් නම් විතරක් අලුත් Barcode එකක් ජෙනරේට් කරනවා
                    const randomPart = Math.floor(Math.random() * 900000) + 100000;
                    finalBarcode = `840${randomPart}${String(i).padStart(4, '0')}`;
                }
            }

            validRows.push({
                rowNum,
                name: String(row.name).trim(),
                barcode: finalBarcode,
                sku: row.sku ? String(row.sku).trim() : null,
                category: row.category ? String(row.category).trim() : 'General',
                buyingPrice: isNaN(buyingPrice) ? 0 : buyingPrice,
                price,
                stock: parseInt(row.stock) || 0,
                unit: ['pcs', 'kg', 'g', 'ltr', 'ml', 'packet', 'bottle', 'bundle'].includes(row.unit) ? row.unit : 'pcs',
                minStockLevel: parseInt(row.minstocklevel || row.minstock || 10) || 10,
                expiryDate: row.expirydate ? new Date(row.expirydate) : null,
                imageUrl: row.imageurl || row.image || null
            });
        }

        if (validRows.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid products found to process.', errorRows });
        }

        // STEP 5: Process images in parallel (Concurrency: 3)
        const CONCURRENCY = 3;
        const rowsWithImages = [...validRows];

        for (let i = 0; i < rowsWithImages.length; i += CONCURRENCY) {
            const batch = rowsWithImages.slice(i, i + CONCURRENCY);
            await Promise.all(
                batch.map(async (row, batchIndex) => {
                    if (row.imageUrl) {
                        const cloudUrl = await downloadAndUploadToCloudinary(row.imageUrl, row.name, req.user.shopId.toString());
                        rowsWithImages[i + batchIndex].processedImageUrl = cloudUrl;
                    }
                })
            );
        }

        // STEP 6: Build MongoDB bulkWrite
        const DEFAULT_IMAGE = 'https://placehold.co/150?text=No+Image';
        const operations = rowsWithImages.map(row => ({
            updateOne: {
                filter: { shopId: req.user.shopId, barcode: row.barcode },
                update: {
                    $set: {
                        shopId: req.user.shopId,
                        name: row.name,
                        barcode: row.barcode,
                        sku: row.sku,
                        category: row.category,
                        buyingPrice: row.buyingPrice,
                        price: row.price,
                        stock: row.stock,
                        unit: row.unit,
                        minStockLevel: row.minStockLevel,
                        expiryDate: row.expiryDate,
                        image: row.processedImageUrl || DEFAULT_IMAGE,
                        status: 'active',
                        updatedBy: req.user._id
                    }
                },
                upsert: true
            }
        }));

        // STEP 7: Execute
        const result = await Product.bulkWrite(operations, { ordered: false });

        return res.status(200).json({
            success: true,
            message: `${validRows.length} products processed.`,
            results: {
                total: rawRows.length,
                processed: validRows.length,
                inserted: result.upsertedCount,
                updated: result.modifiedCount,
                imagesUploaded: rowsWithImages.filter(r => r.processedImageUrl).length,
                imagesFailed: rowsWithImages.filter(r => r.imageUrl && !r.processedImageUrl).length,
                skipped: errorRows.length,
                errorRows: errorRows.slice(0, 20)
            }
        });

    } catch (error) {
        console.error("Bulk Upload Error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: "Duplicate barcode found in Excel." });
        }
        res.status(500).json({ success: false, error: 'Server error during upload.' });
    }
};