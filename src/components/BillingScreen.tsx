import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash, Sparkles, AlertCircle, ShoppingCart, RefreshCw, Layers } from "lucide-react";
import { BillItem } from "../types";
import { formatCurrency } from "../utils";

// Standard popular product presets for smart, instantaneous POS autocomplete suggestions
const PRODUCT_CATALOG = [
  { name: "Premium Basmati Rice (5kg)", price: 650.0 },
  { name: "Organic Assam Green Tea (250g)", price: 280.0 },
  { name: "Premium Mustard Oil (1L)", price: 175.0 },
  { name: "Samyang Hot Ramen Multi-pack", price: 349.0 },
  { name: "Amul Fresh Milk (1L)", price: 66.0 },
  { name: "Chilli Garlic Paste (500g)", price: 120.0 },
  { name: "Premium Shimla Apples (1kg)", price: 160.0 },
  { name: "MTR Vermicelli (500g)", price: 45.0 },
  { name: "Roasted Papad Pack Jumbo", price: 85.0 }
];

const UNIT_OPTIONS = ["pcs", "kg", "pack", "box", "bottle", "bag", "litre"];

interface BillingScreenProps {
  onBillCreated: (bill: any) => void;
  onToast: (text: string, type: "success" | "error" | "warning") => void;
}

export default function BillingScreen({ onBillCreated, onToast }: BillingScreenProps) {
  // Cashier Billing Form Fields
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [items, setItems] = useState<BillItem[]>([]);
  
  // Active Line Entry Form state
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState("pcs");
  
  // Global Billing Totals Context
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // Autocomplete helpers
  const [suggestions, setSuggestions] = useState<{ name: string; price: number }[]>([]);
  const lineProductRef = useRef<HTMLInputElement>(null);

  // 1. Initial mounting check for saved draft backup
  useEffect(() => {
    const fetchDraft = async () => {
      const { apiService } = await import("../services/api");
      const draft = apiService.getDraftBill();
      if (draft) {
        setCustomerName(draft.customerName || "Walk-in Customer");
        setItems(draft.items || []);
        onToast("Active draft state loaded successfully.", "warning");
      }
    };
    fetchDraft();
  }, []);

  // 2. Auto-save draft triggers on state updates
  useEffect(() => {
    const saveDraft = async () => {
      const { apiService } = await import("../services/api");
      apiService.saveDraftBill(customerName, items);
    };
    if (items.length > 0) {
      saveDraft();
    }
  }, [customerName, items]);

  // 3. POS Keyboard shortcut bindings
  useEffect(() => {
    const handleShortcutKeys = (e: KeyboardEvent) => {
      // F2 -> Instant Reset
      if (e.key === "F2") {
        e.preventDefault();
        handleClearAll();
        onToast("POS workspace cleared.", "warning");
      }
      // F8 -> Set focus to product field
      if (e.key === "F8") {
        e.preventDefault();
        lineProductRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcutKeys);
    return () => window.removeEventListener("keydown", handleShortcutKeys);
  }, [items, customerName, paymentMethod]);

  // Dynamic calculations
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.total, 0);
  const calculatedGrandTotal = calculatedSubtotal;

  // Handle live typing in autocomplete suggestions
  const handleProductTyping = (text: string) => {
    setProductName(text);
    if (text.trim().length > 0) {
      const matched = PRODUCT_CATALOG.filter(p =>
        p.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (prod: { name: string; price: number }) => {
    setProductName(prod.name);
    setUnitPrice(String(prod.price));
    setSuggestions([]);
  };

  // Commit dynamic line item entry
  const handleAddLineItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!productName.trim()) {
      onToast("Line products descriptor is required.", "error");
      return;
    }
    
    const parsedPrice = parseFloat(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      onToast("Enter a valid price greater than zero.", "error");
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      onToast("Quantity must be 1 or greater.", "error");
      return;
    }

    const itemTotal = parsedQty * parsedPrice;
    
    // Check if product namespace is already in list -> Increment qty
    const existingIndex = items.findIndex(item => 
      item.product_name.toLowerCase() === productName.toLowerCase().trim()
    );

    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += parsedQty;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          product_name: productName.trim(),
          quantity: parsedQty,
          unit_price: parsedPrice,
          total: itemTotal
        }
      ]);
    }

    // Reset entry state
    setProductName("");
    setUnitPrice("");
    setQuantity("1");
    setSuggestions([]);
    lineProductRef.current?.focus(); // autofocus counter index
  };

  // Remove individual lines
  const handleRemoveLineItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    if (updated.length === 0) {
      localStorage.removeItem("kr_store_draft_bill");
    }
  };

  // Clear workspace
  const handleClearAll = () => {
    setCustomerName("Walk-in Customer");
    setItems([]);
    setProductName("");
    setUnitPrice("");
    setQuantity("1");
    setSuggestions([]);
    localStorage.removeItem("kr_store_draft_bill");
  };

  // Trigger POST checkout creation
  const handleFinalizeBill = async () => {
    if (items.length === 0) {
      onToast("Please add at least one item to proceed checkout.", "error");
      return;
    }

    setLoading(true);
    try {
      const { apiService } = await import("../services/api");
      const payload = {
        customer_name: customerName,
        items,
        subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
        grand_total: parseFloat(calculatedGrandTotal.toFixed(2)),
        payment_method: paymentMethod
      };

      const res = await apiService.createBill(payload);
      if (res.success && res.bill) {
        onToast(res.message || "Purchase Bill generated!", "success");
        onBillCreated(res.bill); // open printed dialogue
        handleClearAll(); // Clear fields
      } else {
        onToast(res.message || "Checkout execution failed.", "error");
      }
    } catch (err) {
      onToast("Connection timeout. Saved to cache.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
      {/* LEFT: Item Entry & Transaction Ledger Matrix (8 Cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Quick-loader Barcode Autocomplete panel - Bento card style */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <h2 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5 font-sans uppercase tracking-widest">
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            Cash Counter Entry
          </h2>

          <form onSubmit={handleAddLineItem} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Auto-suggest Item Description */}
            <div className="sm:col-span-6 relative">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Product Name (F8 to focus)
              </label>
              <input
                id="item-name-field"
                ref={lineProductRef}
                type="text"
                autoComplete="off"
                value={productName}
                onChange={(e) => handleProductTyping(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
                placeholder="Search catalog or type custom item..."
              />
              
              {/* Overlapping matching catalog selector list */}
              {suggestions.length > 0 && (
                <div id="autocomplete-suggestions" className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-hidden divide-y divide-slate-100 dark:divide-slate-900">
                  {suggestions.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionSelect(p)}
                      className="w-full px-4 py-2.5 text-left text-xs bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-mono flex items-center justify-between transition-colors"
                    >
                      <span className="font-sans font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual price input */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Unit Price
              </label>
              <input
                id="item-price-field"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none text-right transition-all"
                placeholder="0.00"
              />
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Quantity
              </label>
              <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-1 items-center">
                <input
                  id="item-quantity-field"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-2 py-2.5 bg-transparent border-none text-slate-900 dark:text-white font-mono text-xs focus:outline-none text-center"
                />
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="bg-transparent text-slate-500 border-none text-[10px] uppercase font-bold pr-1 outline-none cursor-pointer"
                >
                  {UNIT_OPTIONS.map(opt => (
                     <option key={opt} value={opt} className="dark:bg-slate-950">{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Action Button */}
            <div className="sm:col-span-2">
              <button
                id="add-item-button"
                type="submit"
                className="w-full py-2.5 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={16} />
                Add (F8)
              </button>
            </div>
          </form>
        </div>

        {/* Ledger items card - Bento card style */}
        <div className="min-h-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-xs font-extrabold text-slate-400 lg:text-slate-500 flex items-center gap-2 uppercase tracking-widest">
              <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
              Store Basket Checklist ({items.length} items)
            </span>
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider"
              >
                <Trash size={12} /> Clear Slate (F2)
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            {items.length === 0 ? (
              <div id="empty-cart-view" className="h-full flex flex-col items-center justify-center text-center p-8 mt-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-3 animate-pulse">
                  <ShoppingCart size={24} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">POS Ledger Empty</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px] mt-1">
                  Type products above or click catalog suggestions to fill out tax bill notes instant.
                </p>
              </div>
            ) : (
              <table id="bill-items-table" className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950 font-sans border-b border-slate-100 dark:border-slate-800">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    <th className="px-6 py-3.5 text-center w-12">#</th>
                    <th className="px-4 py-3.5">Purchased Item Code / Details</th>
                    <th className="px-4 py-3.5 text-right w-24">Unit Cost</th>
                    <th className="px-4 py-3.5 text-center w-24">Quantity</th>
                    <th className="px-4 py-3.5 text-right w-28">Total Price</th>
                    <th className="px-6 py-3.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-3.5 text-center text-slate-400 font-sans font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-sans font-semibold text-slate-900 dark:text-white">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-slate-800 dark:text-slate-300">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600 dark:text-slate-400 font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-950 dark:text-white">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Customer Meta, Tax controls & Billing Checkout Panel (4 Cols) */}
      <div className="lg:col-span-4 space-y-6">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
          <h2 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800 pb-3 uppercase tracking-widest">
            Checkout Desk
          </h2>

          {/* Customer Metadata info */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Customer Name / Firm
            </label>
            <input
              id="customer-name-field"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
              placeholder="Walk-in Customer"
            />
          </div>

          {/* Payment option */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
              Receipt Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Cash", "UPI", "Card"].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    paymentMethod === method
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm font-extrabold"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Summation Totaling block representation */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-2 text-xs font-mono text-slate-700 dark:text-slate-400">
            <div className="flex justify-between">
              <span>TOTAL ITEMS:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>TOTAL QTY:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>

            <div className="border-t border-dashed border-slate-250 dark:border-slate-800 my-2 pt-2 flex justify-between text-sm text-slate-900 dark:text-white font-sans font-bold">
              <span>GRAND TOTAL:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-base font-extrabold">{formatCurrency(calculatedGrandTotal)}</span>
            </div>
          </div>

          <button
            id="finalize-bill-button"
            onClick={handleFinalizeBill}
            disabled={items.length === 0 || loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Processing Transaction...
              </>
            ) : (
              "Generate Bill (Ctrl+Enter)"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
