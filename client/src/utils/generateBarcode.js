import JsBarcode from 'jsbarcode';
import Swal from 'sweetalert2'; // 🚀 UI UPGRADE: SweetAlert Import කළා

// 🛡️ SECURITY FIX: XSS Protection Helper
const sanitizeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// 🚀 UI UPGRADE: ෆන්ක්ෂන් එක async කළා SweetAlert එකට සපෝර්ට් කරන්න
export const printBarcodeLabel = async (product, shopName = 'NEXIACORE POS') => {
    
    const barcodeValue = product.barcode || product.sku;
    
    if (!barcodeValue) {
        // අර කැත Alert එක වෙනුවට ලස්සන Error Modal එකක්
        Swal.fire({
            title: 'Cannot Print',
            text: 'No Barcode or SKU found for this product. Please edit the product and add a Barcode/SKU first.',
            icon: 'error',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
        return;
    }

    // 🚀 UI UPGRADE: පරණ Prompt එක අයින් කරලා SweetAlert Number Input එකක් දැම්මා!
    const { value: qtyInput, isConfirmed } = await Swal.fire({
        title: 'Print Barcodes',
        html: `How many labels do you want to print for <br/><b class="text-blue-500">${product.name}</b>?`,
        icon: 'question',
        input: 'number',
        inputValue: 24, // Default අගය
        inputAttributes: {
            min: 1,
            step: 1
        },
        showCancelButton: true,
        confirmButtonText: 'Generate Labels',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#64748b',
        customClass: {
            popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem] shadow-2xl',
            input: 'text-center text-lg font-bold dark:bg-slate-900 dark:text-white border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors',
        },
        inputValidator: (value) => {
            if (!value || value <= 0) {
                return 'Please enter a valid quantity!';
            }
        }
    });

    // User Cancel කළොත් මෙතනින් නවතිනවා
    if (!isConfirmed) return;

    const LABEL_COUNT = parseInt(qtyInput, 10);

    // ---------------------------------------------------------
    // මීට පස්සේ තියෙන Barcode හදන Logic එක කලින් වගේමයි
    // ---------------------------------------------------------

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
        Swal.fire({
            title: 'Generation Failed',
            text: 'Could not generate barcode. The format might be invalid for CODE128.',
            icon: 'error',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
        return;
    }

    const barcodeDataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) {
        Swal.fire({
            title: 'Pop-up Blocked',
            text: 'Please allow pop-ups in your browser to print barcode labels.',
            icon: 'warning',
            customClass: { popup: 'dark:bg-slate-800 dark:text-slate-100 rounded-[2rem]' }
        });
        return;
    }

    const safeShopName = sanitizeHTML(shopName);
    const safeBarcodeValue = sanitizeHTML(barcodeValue);
    const rawName = product.name ? String(product.name) : 'Unknown Product';
    const safeName = sanitizeHTML(rawName);
    const displayName = safeName.length > 25 ? safeName.substring(0, 25) + '...' : safeName;
    const safePrice = parseFloat(product.price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });

    let labelsHtml = '';
    for (let i = 0; i < LABEL_COUNT; i++) {
        labelsHtml += `
            <div class="label">
                <div class="shop-name">${safeShopName}</div>
                <div class="product-name">${displayName}</div>
                <div class="price">Rs. ${safePrice}</div>
                <img class="barcode-img" src="${barcodeDataUrl}" alt="${safeBarcodeValue}" />
            </div>
        `;
    }

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Barcodes - ${safeName}</title>
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
                    grid-template-columns: repeat(4, 48mm);
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
                    height: 38mm; 
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
                    height: 35px;
                    object-fit: contain;
                }
                
                @media print {
                    body { padding: 0; }
                    .label { 
                        border: none;
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
                window.onload = async () => {
                    await document.fonts.ready;
                    window.print();
                    window.onafterprint = () => window.close();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};