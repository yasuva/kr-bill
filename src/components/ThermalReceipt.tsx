import React from "react";
import { Printer, Download, X, HelpCircle, CheckCircle2 } from "lucide-react";
import { Bill } from "../types";
import { formatCurrency } from "../utils";

interface ThermalReceiptProps {
  bill: Bill;
  onClose: () => void;
  onToast: (text: string, type: "success" | "error") => void;
}

export default function ThermalReceipt({ bill, onClose, onToast }: ThermalReceiptProps) {
  const handlePrint = () => {
    // Open dynamic printed frame or print standard bill_no structure
    window.print();
    onToast("Sending invoice to print queue...", "success");
  };

  const handleDownloadPDF = async () => {
    try {
      onToast("Loading professional invoice PDF...", "success");
      const res = await fetch(`/api/bill/${bill.bill_no}/pdf`, {
        headers: {
          "Accept": "application/json"
        }
      });
      const data = await res.json();
      if (data.success && data.pdf_url && data.pdf_url !== "#") {
        window.open(data.pdf_url, "_blank");
      } else {
        // Fallback to HTML Print layout
        window.open(`/api/bill/${bill.bill_no}/pdf`, "_blank");
      }
    } catch (err) {
      // Fallback
      window.open(`/api/bill/${bill.bill_no}/pdf`, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm my-8 bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Title Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Transaction Saved
          </span>
          <button
            onClick={onClose}
            className="p-1 px-2.5 rounded-lg bg-slate-200/50 text-slate-600 hover:text-slate-950 transition-colors"
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrolling Receipt Scroll Wrapper */}
        <div className="p-6 bg-slate-50 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Virtual 58mm receipt paper strip mockup */}
          <div className="w-full bg-white border border-slate-200/60 shadow-lg p-5 font-mono text-xs leading-5 text-slate-800 relative receipt-paper mb-4 rounded-xl">
            {/* Top jagged paper edge effect */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-b from-slate-200 to-transparent"></div>

            {/* Shop Header */}
            <div className="text-center mb-4">
              <h1 className="text-base font-black tracking-tighter text-slate-950 uppercase">
                KR STORE RETAIL
              </h1>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Market District, Mumbai, India
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Tel: +91-22-1234-5678
              </p>
              <div className="border-t border-dashed border-slate-300 my-2"></div>
            </div>

            {/* Invoicing Meta Fields */}
            <div className="space-y-0.5 mb-3 font-mono text-[10px] text-slate-600">
              <p>BILL NO: <span className="text-slate-900 border-b border-slate-200 font-bold">{bill.bill_no}</span></p>
              <p>DATE: {bill.date} | TIME: {bill.time}</p>
              <p>CUSTOMER: {bill.customer_name || "Walk-in Customer"}</p>
              <p>CASHIER ID: KR-A09</p>
              <p>PAYMENT METHOD: <span className="uppercase text-slate-950 font-bold">{bill.payment_method}</span></p>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Table Column headers */}
            <div className="grid grid-cols-12 font-bold text-slate-900 mb-1 leading-5 text-[10px] tracking-tight uppercase">
              <span className="col-span-6 text-left">Item</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-1 text-center font-normal">Qty</span>
              <span className="col-span-3 text-right">Total</span>
            </div>
            
            <div className="border-t border-dashed border-slate-300 my-1"></div>

            {/* List items */}
            <div className="space-y-1.5 py-1 text-[10px] text-slate-800">
              {bill.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-0.5 leading-4 border-b border-slate-50 pb-1 align-top font-mono">
                  <span className="col-span-6 text-left truncate break-words font-sans" title={item.product_name}>
                    {item.product_name}
                  </span>
                  <span className="col-span-2 text-right">
                    {formatCurrency(item.unit_price)}
                  </span>
                  <span className="col-span-1 text-center font-normal">
                    {item.quantity}
                  </span>
                  <span className="col-span-3 text-right font-semibold text-slate-950">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Financial Totals layout */}
            <div className="space-y-1 font-mono text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>TOTAL ITEMS:</span>
                <span>{bill.items?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL QTY:</span>
                <span>{bill.items?.reduce((acc, item) => acc + item.quantity, 0) || 0}</span>
              </div>
              <div className="border-t border-dashed border-slate-300 my-1"></div>
              <div className="flex justify-between font-bold text-xs text-slate-950">
                <span>GRAND TOTAL:</span>
                <span>{formatCurrency(bill.grand_total)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-3"></div>

            {/* Footer barcode/Thank you */}
            <div className="text-center font-mono">
              <p className="text-[10px] text-slate-950 font-bold italic">
                THANK YOU FOR SHOPPING!
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
                Returns registration supported worldwide
              </p>
              
              {/* Virtual barcoded section */}
              <div className="mt-4 flex flex-col items-center">
                <div className="flex items-center gap-0.5 h-7">
                  {[1,3,1,1,2,3,1,2,1,3,1,2,3,1,1,2,1,3,1,1,2].map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 h-full"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <span className="text-[8px] tracking-widest text-slate-500 mt-1 font-mono">
                  *{bill.bill_no}*
                </span>
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Paper width: 58mm standard</span>
        </div>

        {/* Print Option Action Triggers */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all"
          >
            <Printer size={16} />
            Thermal Print
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Download size={16} />
            Invoice PDF
          </button>
        </div>
      </div>
    </div>
  );
}
