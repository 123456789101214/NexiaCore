import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Generate Excel file buffer from products array
const generateExcelBuffer = (products) => {
    // Map products to Excel rows
    const rows = products.map((p, index) => {
        // 💡 FIX: Generate a realistic 13-digit unique barcode if missing
        // Format: 840 (prefix) + 6 random digits + 4 digit index (guarantees uniqueness)
        const randomPart = Math.floor(Math.random() * 900000) + 100000;
        const autoBarcode = p.barcode || `840${randomPart}${String(index).padStart(4, '0')}`;

        return {
            'name': p.name,
            'barcode': autoBarcode, // <--- දැන් හැම එකකටම Unique බාර්කෝඩ් එකක් තියෙනවා
            'sku': p.sku || `SKU${String(index + 1).padStart(4, '0')}`,
            'category': p.category,
            'buyingPrice': p.buyingPrice,
            'price': p.price,
            'stock': p.stock || 0,
            'unit': p.unit || 'pcs',
            'minStockLevel': p.minStockLevel || 10,
            'expiryDate': p.expiryDate || '',
            'imageFileName': p.imageFileName || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Style column widths
    ws['!cols'] = [
        { wch: 35 }, // name
        { wch: 15 }, // barcode
        { wch: 10 }, // sku
        { wch: 18 }, // category
        { wch: 12 }, // buyingPrice
        { wch: 10 }, // price
        { wch: 8  }, // stock
        { wch: 8  }, // unit
        { wch: 14 }, // minStockLevel
        { wch: 12 }, // expiryDate
        { wch: 25 }, // imageFileName
    ];

    // Bold header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = { font: { bold: true }, fill: { fgColor: { rgb: '1E293B' } } };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};
// Main function: Generate Excel + ZIP and download BOTH separately
export const generateAndDownload = async (products, imageMap, shopName) => {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const safeName = shopName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'nexiacore';

    // 1. Attach images to ZIP + update imageFileName in products
    const productsWithImages = products.map(product => {
        const categoryImage = imageMap.get(product.category);
        if (categoryImage && categoryImage.blob) {
            const filename = `${product.category.replace(/\s+/g, '-').toLowerCase()}.jpg`;
            zip.file(filename, categoryImage.blob);
            return { ...product, imageFileName: filename };
        }
        return product;
    });

    // 2. Download Excel File SEPARATELY
    const excelBuffer = generateExcelBuffer(productsWithImages);
    const excelBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(excelBlob, `${safeName}_inventory_${timestamp}.xlsx`);

    // 3. Download Images ZIP SEPARATELY (Only if there are images)
    if (Object.keys(zip.files).length > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(zipBlob, `${safeName}_images_${timestamp}.zip`);
    }

    return productsWithImages.length;
};

export const downloadExcelOnly = (products, shopName) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = shopName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'nexiacore';
    const excelBuffer = generateExcelBuffer(products);
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${safeName}_products_${timestamp}.xlsx`);
};