    import xlsx from 'xlsx';
    import AdmZip from 'adm-zip';
    import fs from 'fs';

    // 💡 A valid 1x1 pixel Blue color PNG image in Base64 (Cloudinary will accept this)
    const base64PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADVwInhM+wGgAAAABJRU5ErkJggg==";
    const imageBuffer = Buffer.from(base64PNG, 'base64');

    const generateTestFiles = () => {
        console.log("🚀 Generating 100 Test Products...");

        const products = [];
        const zip = new AdmZip();

        const categories = [
            'Grocery', 
            'Beverages', 
            'Snacks', 
            'Personal Care', 
            'Dairy', 
            'Electronics & Gadgets', 
            'Pet Supplies', 
            'Hardware & Tools', 
            'Automotive Parts', 
            'Imported Cosmetics'];
        const units = ['pcs', 'kg', 'pkt', 'bottle'];

        for (let i = 1; i <= 100; i++) {
            // 1. Generate realistic test data
            const category = categories[Math.floor(Math.random() * categories.length)];
            const unit = units[Math.floor(Math.random() * units.length)];
            const buyingPrice = Math.floor(Math.random() * 500) + 50;
            const sellingPrice = buyingPrice + Math.floor(Math.random() * 200) + 20;
            const imageName = `test_product_${i}.png`;

            products.push({
                'name': `Test Supermarket Item ${i}`,
                'barcode': `84000${1000 + i}`,
                'sku': `SKU-TST-${i}`,
                'category': category,
                'buyingPrice': buyingPrice,
                'price': sellingPrice,
                'stock': 0,
                'unit': unit,
                'minStockLevel': 5,
                'expiryDate': '2026-12-31',
                'imageFileName': imageName
            });

            // 2. Add the real 1x1 valid PNG image to the ZIP file
            zip.addFile(imageName, imageBuffer);
        }

        // 3. Create the Excel File
        const ws = xlsx.utils.json_to_sheet(products);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Products');
        
        const excelFileName = 'NexiaCore_Test_100_Products.xlsx';
        xlsx.writeFile(wb, excelFileName);
        console.log(`✅ Excel file created: ${excelFileName}`);

        // 4. Create the ZIP File
        const zipFileName = 'NexiaCore_Test_Images.zip';
        zip.writeZip(zipFileName);
        console.log(`✅ ZIP file created: ${zipFileName} (Contains 100 images)`);

        console.log("\n🎉 All test files generated successfully! You can now use them in the Bulk Upload modal.");
    };

    generateTestFiles();