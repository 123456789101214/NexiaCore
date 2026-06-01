import JsBarcode from 'jsbarcode';

export const printBarcodeLabel = (product, shopName = 'NEXIACORE POS') => {
    // Barcode එකක් නැත්නම් SKU එක ගන්නවා, ඒකත් නැත්නම් Object ID එකේ කෑල්ලක් ගන්නවා
    const barcodeValue = product.barcode || product.sku || product._id.substring(0, 10);

    // 1. Memory එක ඇතුළේ තාවකාලික Canvas එකක් හදලා ඒකට Barcode එක අඳිනවා
    const canvas = document.createElement('canvas');
    try {
        JsBarcode(canvas, barcodeValue, {
            format: 'CODE128',
            width: 2,
            height: 40,
            displayValue: true,
            fontSize: 14,
            margin: 5,
            fontOptions: "bold",
            background: "#ffffff",
            lineColor: "#000000"
        });
    } catch (error) {
        console.error('Barcode generation failed:', error);
        alert('Could not generate barcode for this product. Format might be invalid.');
        return;
    }

    // 2. ඒ Canvas එක Base64 Image එකක් (Data URL) බවට පත් කරනවා
    const barcodeDataUrl = canvas.toDataURL('image/png');

    // 3. Print කරන්න අලුත් Window එකක් ඕපන් කරනවා
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) {
        alert('Please allow pop-ups in your browser to print barcode labels.');
        return;
    }

    // 4. A4 Sheet එකකට ගැලපෙන විදිහට ලේබල් 24ක් (4 columns x 6 rows) හදනවා
    const LABEL_COUNT = 24; 
    let labelsHtml = '';

    for (let i = 0; i < LABEL_COUNT; i++) {
        // දිග නම් තියෙනවා නම් ඒක කපලා පෙන්වනවා (Label එකෙන් පිට පනින්නේ නැති වෙන්න)
        const displayName = product.name.length > 25 
            ? product.name.substring(0, 25) + '...' 
            : product.name;

        labelsHtml += `
            <div class="label">
                <div class="shop-name">${shopName}</div>
                <div class="product-name">${displayName}</div>
                <div class="price">Rs. ${parseFloat(product.price).toLocaleString()}</div>
                <img class="barcode-img" src="${barcodeDataUrl}" alt="${barcodeValue}" />
            </div>
        `;
    }

    // 5. සම්පූර්ණ HTML Template එක (Production-ready CSS එක්ක)
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcodes - ${product.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                
                body {
                    margin: 0;
                    padding: 10mm;
                    font-family: 'Inter', sans-serif;
                    background: #fff;
                }
                
                .page {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6mm 4mm;
                }
                
                .label {
                    border: 1px dashed #cbd5e1;
                    padding: 8px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 38mm; /* Standard label height */
                    box-sizing: border-box;
                    border-radius: 4px;
                }
                
                .shop-name { 
                    font-size: 8px; 
                    font-weight: 900; 
                    color: #64748b; 
                    text-transform: uppercase; 
                    letter-spacing: 1px;
                }
                
                .product-name { 
                    font-size: 11px; 
                    font-weight: 700; 
                    margin: 4px 0; 
                    color: #0f172a;
                    display: -webkit-box; 
                    -webkit-line-clamp: 2; 
                    -webkit-box-orient: vertical; 
                    overflow: hidden; 
                    line-height: 1.2;
                }
                
                .price { 
                    font-size: 14px; 
                    font-weight: 900; 
                    color: #000; 
                    margin-bottom: 4px; 
                }
                
                .barcode-img { 
                    max-width: 100%; 
                    height: 35px; /* Fixed height so it doesn't break layout */
                    object-fit: contain;
                }
                
                /* Print Specific Styles */
                @media print {
                    body { padding: 0; }
                    .label { 
                        border: none; /* Print කරද්දී කොටු පේන්නේ නෑ */
                        page-break-inside: avoid;
                    }
                    @page { 
                        margin: 10mm; 
                        size: A4 portrait; 
                    }
                }
            </style>
        </head>
        <body>
            <div class="page">
                ${labelsHtml}
            </div>
            <script>
                // ලෝඩ් වුණ ගමන් Print Dialog එක ඕපන් කරනවා, Print කළාට පස්සේ Window එක වහනවා
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = () => window.close();
                    }, 300); // 300ms delay for images to fully render
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};