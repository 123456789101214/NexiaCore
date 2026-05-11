// FIXED: Feature - Naya Potha Receipt Integration with Full Customer Details (Phone & NIC)
import React from 'react';

// 💡 PRO FIX: Added customerPhone and customerNic to props
const PrintableReceipt = React.forwardRef(({ cart, total, billNumber, user, paidAmount, changeAmount, paymentMethod, products, customerName, customerPhone, customerNic }, ref) => {
    
    const totalSavings = cart.reduce((acc, item) => {
        const product = products?.find(p => p._id === (item.productId || item._id));
        const originalPrice = product ? product.price : (item.originalPrice || item.price);
        
        if (originalPrice > item.price) {
            return acc + ((originalPrice - item.price) * item.quantity);
        }
        return acc;
    }, 0);

    return (
        <div ref={ref} className="p-6 w-[80mm] bg-white text-black font-mono leading-tight">
            
            {/* Header - Brand Identity */}
            <div className="text-center mb-4">
                <div className="border-2 border-black inline-block px-2 py-1 mb-1">
                    <h1 className="text-xl font-black tracking-tighter uppercase">{user?.shopName || 'NEXMART'}</h1>
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest">Supermart</h2>
                <p className="text-[9px] font-medium leading-3 mt-1">
                    Premium Quality • Lifestyle • Grocery<br />
                    No. 45, Highlevel Road, Colombo 06<br />
                    Hotline: +94 112 888 999
                </p>
            </div>

            {/* Invoice Info Section */}
            <div className="flex justify-between text-[10px] border-y border-dashed border-slate-400 py-2 mb-3">
                <div className="space-y-0.5">
                    <p><span className="font-bold">INV NO:</span> {billNumber}</p>
                    <p><span className="font-bold">CASHIER:</span> {user?.name?.toUpperCase() || 'ADMIN'}</p>
                    
                    {/* 🛡️ PRO FIX: Show Customer Name, Phone & NIC for strict identification */}
                    {customerName && customerName !== 'Walk-in Customer' && (
                        <div className="pt-1 mt-1 border-t border-dashed border-slate-300">
                            <p><span className="font-bold">CUST:</span> {customerName.toUpperCase()}</p>
                            {customerPhone && <p><span className="font-bold">TEL:</span> {customerPhone}</p>}
                            {customerNic && <p><span className="font-bold">NIC:</span> {customerNic.toUpperCase()}</p>}
                        </div>
                    )}
                </div>
                <div className="text-right space-y-0.5">
                    <p>{new Date().toLocaleDateString()}</p>
                    <p>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-4 text-[11px]">
                <thead>
                    <tr className="border-b border-black">
                        <th className="text-left py-1 font-bold w-[50%]">ITEM</th>
                        <th className="text-center py-1 font-bold w-[20%]">QTY</th>
                        <th className="text-right py-1 font-bold w-[30%]">PRICE</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-300">
                    {cart.map((item, index) => {
                        const product = products?.find(p => p._id === (item.productId || item._id));
                        const originalPrice = product ? product.price : (item.originalPrice || item.price);
                        const hasDiscount = originalPrice > item.price;

                        return (
                            <tr key={index}>
                                <td className="py-2 pr-2 font-medium">
                                    <span className="uppercase block line-clamp-2">{item.name}</span>
                                    {hasDiscount && (
                                        <span className="text-[9px] bg-black text-white px-1 rounded inline-block mt-0.5">FLASH SALE</span>
                                    )}
                                </td>
                                <td className="text-center py-2 align-top">{item.quantity}</td>
                                <td className="text-right py-2 align-top">
                                    {hasDiscount && (
                                        <div className="text-[9px] line-through text-slate-500">
                                            {(originalPrice * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </div>
                                    )}
                                    <div className="font-bold">{(item.price * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Calculations Section */}
            <div className="space-y-1 border-t border-black pt-2 text-[11px]">
                <div className="flex justify-between text-base font-black border-b-2 border-black pb-1 mb-2">
                    <span>NET TOTAL</span>
                    <span>Rs. {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>

                {totalSavings > 0 && (
                    <div className="flex justify-between font-bold text-black border-b border-dashed border-slate-300 pb-2 mb-2">
                        <span>TOTAL SAVINGS!</span>
                        <span>- Rs. {totalSavings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                )}

                <div className="space-y-1 pt-1">
                    <div className="flex justify-between font-bold text-[10px]">
                        <span>PAYMENT TYPE</span>
                        <span className="uppercase bg-slate-200 px-1.5 py-0.5 rounded text-black font-black">
                            {paymentMethod || 'CASH'}
                        </span>
                    </div>

                    {(paymentMethod === 'Cash' || !paymentMethod) && (
                        <>
                            <div className="flex justify-between font-bold mt-1">
                                <span>CASH PAID</span>
                                <span>Rs. {Number(paidAmount || total).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-dashed border-slate-400 pt-1">
                                <span>BALANCE</span>
                                <span>Rs. {Number(changeAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        </>
                    )}

                    {paymentMethod === 'Credit' && (
                        <div className="mt-3 text-center border-t border-dashed border-slate-400 pt-2 pb-1 bg-slate-100">
                            <p className="text-[11px] font-black uppercase tracking-widest">Billed To Credit</p>
                            {customerName && (
                                <p className="text-[9px] mt-0.5 font-bold">A/C: {customerName.toUpperCase()}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 space-y-3">
                <div className="flex justify-center">
                    <div className="w-16 h-16 border border-slate-300 flex items-center justify-center text-[8px] text-slate-400 font-bold">
                        SCAN TO VALIDATE
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase">Thank you for shopping!</p>
                    <p className="text-[9px]">Please keep this receipt for returns.</p>
                </div>
                <div className="pt-2">
                    <p className="text-[8px] font-sans text-slate-400">Software by PrimeGraphix Solutions</p>
                </div>
            </div>
        </div>
    );
});

export default PrintableReceipt;