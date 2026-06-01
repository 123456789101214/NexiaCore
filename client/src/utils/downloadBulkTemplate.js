import * as xlsx from 'xlsx';

export const downloadBulkTemplate = () => {
    const templateData = [
        {
            'name': 'Sample Product (Required)',
            'barcode': '1234567890',
            'sku': 'SKU001',
            'category': 'General',
            'buyingPrice': 100,
            'price': 150,
            'stock': 0,
            'unit': 'pcs',
            'minStockLevel': 10,
            'expiryDate': '2026-12-31',
            'imageFileName': 'product1.jpg'
        }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Products');

    // Column widths for better UX
    ws['!cols'] = [
        {wch:30}, {wch:15}, {wch:10}, {wch:15}, {wch:12},
        {wch:10}, {wch:8}, {wch:8}, {wch:14}, {wch:12}, {wch:20}
    ];

    xlsx.writeFile(wb, 'NexiaCore_Bulk_Upload_Template.xlsx');
};