import React, { useState, useEffect } from "react";
import { Search, Calendar, RefreshCcw, FileText, Printer, Trash2, ArrowUpRight, IndianRupee, CalendarCheck, BarChart3, HelpCircle, Loader2 } from "lucide-react";
import { Bill } from "../types";
import { formatCurrency } from "../utils";

interface AdminDashboardProps {
  onReprint: (bill: Bill) => void;
  onToast: (text: string, type: "success" | "error" | "warning") => void;
}

export default function AdminDashboard({ onReprint, onToast }: AdminDashboardProps) {
  // Billing lists state
  const [bills, setBills] = useState<Bill[]>([]);
  const [todaySales, setTodaySales] = useState({ total: 0, count: 0 });
  const [monthlySales, setMonthlySales] = useState({ total: 0, count: 0 });
  
  // Filtering & Query states
  const [searchQuery, setSearchQuery] = useState("");
  const [exactDate, setExactDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load analytical summaries and ledger lists from API
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const { apiService } = await import("../services/api");
        
        // Fetch calculations & list in parallel for extreme speed
        const [allBills, todayMetrics, monthlyMetrics] = await Promise.all([
          apiService.getBills({ q: searchQuery, date: exactDate }),
          apiService.getTodaySales(),
          apiService.getMonthlySales()
        ]);

        setBills(allBills);
        setTodaySales({ total: todayMetrics.total_sales, count: todayMetrics.count });
        setMonthlySales({ total: monthlyMetrics.total_sales, count: monthlyMetrics.count });
      } catch (err) {
        onToast("Dashboard metrics loading offline backup.", "warning");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [searchQuery, exactDate, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    onToast("Syncing data with server...", "success");
  };

  const handleDelete = async (billNo: string) => {
    if (!window.confirm(`Are you sure you want to delete / void transaction: ${billNo}?`)) {
      return;
    }
    
    try {
      const { apiService } = await import("../services/api");
      const ok = await apiService.deleteBill(billNo);
      if (ok) {
        onToast(`Bill ${billNo} deleted successfully.`, "success");
        setRefreshTrigger(prev => prev + 1);
      } else {
        onToast("Failed to remove invoice.", "error");
      }
    } catch {
      onToast("Network timeout. Deleted local cache profile.", "error");
    }
  };

  const handleOpenPDF = async (b: Bill) => {
    if (b.pdf_url && b.pdf_url !== "#" && b.pdf_url.startsWith("http")) {
      window.open(b.pdf_url, "_blank");
      onToast("Opening dynamic PDF invoice...", "success");
      return;
    }

    try {
      onToast("Loading professional invoice PDF...", "success");
      const res = await fetch(`/api/bill/${b.bill_no}/pdf`, {
        headers: {
          "Accept": "application/json"
        }
      });
      const data = await res.json();
      if (data.success && data.pdf_url && data.pdf_url !== "#") {
        window.open(data.pdf_url, "_blank");
      } else {
        // Fallback to HTML Print layout
        window.open(`/api/bill/${b.bill_no}/pdf`, "_blank");
      }
    } catch (err) {
      // Fallback
      window.open(`/api/bill/${b.bill_no}/pdf`, "_blank");
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (bills.length === 0) {
      onToast("No data to export.", "error");
      return;
    }

    const headers = ["Bill No", "Customer", "Date", "Time", "Grand Total", "Payment"];
    const rows = bills.map(b => [
      b.bill_no,
      b.customer_name,
      b.date,
      b.time,
      b.grand_total.toFixed(2),
      b.payment_method
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KR_Store_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onToast("Transaction records downloaded as CSV.", "success");
  };

  // Extract Sum of all Sales currently in this list
  const grandTotalSalesSum = bills.reduce((acc, b) => acc + b.grand_total, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Action Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Admin Sales Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track business, check metrics, and void billing registers.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            Export CSV
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            Sync Ledger
          </button>
        </div>
      </div>

      {/* 2. Bento Analytical Metrics Grid Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric A: Daily Live Sales */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/10 shadow-inner">
            <CalendarCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold font-sans">Today Sales</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(todaySales.total)}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-indigo-500 font-bold">Live count:</span> {todaySales.count} transactions
            </p>
          </div>
        </div>

        {/* Metric B: Monthly Sales summaries */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/10 shadow-inner">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold font-sans">Active Month</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(monthlySales.total)}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-purple-500 font-bold">Month cycle:</span> {monthlySales.count} payments
            </p>
          </div>
        </div>

        {/* Metric C: Cumulative List Sales */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/10 shadow-inner">
            <IndianRupee size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold font-sans">Filtered Sum</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(grandTotalSalesSum)}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-emerald-500 font-bold">Total list:</span> {bills.length} entries
            </p>
          </div>
        </div>

        {/* Metric D: Extra registered ledger tracker */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500 border border-amber-100 dark:border-amber-900/10 shadow-inner">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold font-sans">Total Ledger</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {bills.length} bills
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <span className="text-amber-500 font-bold">Local cache:</span> operational
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search and Date Filters Row */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search query field */}
        <div className="relative w-full sm:max-w-xs block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            id="bill-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
            placeholder="Search Bill No or Customer..."
          />
        </div>

        {/* Exact date selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            Filter Date
          </label>
          <div className="relative w-full sm:w-44">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Calendar size={14} />
            </span>
            <input
              id="bill-date-filter"
              type="date"
              value={exactDate}
              onChange={(e) => setExactDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-850 dark:text-white text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>
          {exactDate && (
            <button
              onClick={() => setExactDate("")}
              className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Billing Logs table card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden min-h-[300px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 size={36} className="animate-spin text-indigo-600" />
            <span className="text-xs font-semibold mt-3 font-sans">Compiling financial data sheets...</span>
          </div>
        ) : bills.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center mt-6">
            <HelpCircle size={40} className="text-slate-300 dark:text-slate-700 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3">Ledger Logs Empty</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">
              No transactions matched your search or filters. Reset dates or type a different query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-grow">
            <table id="recent-bills-table" className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50 dark:bg-slate-950 font-sans border-b border-slate-100 dark:border-slate-800">
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  <th className="px-6 py-4">Bill No</th>
                  <th className="px-4 py-4">Buyer Customer Profile</th>
                  <th className="px-4 py-4 text-center">Date & Time</th>
                  <th className="px-4 py-4 text-center">Items Count</th>
                  <th className="px-4 py-4 text-right">Grand Total</th>
                  <th className="px-6 py-4 text-center">POS Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {bills.map((b) => (
                  <tr key={b.bill_no} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Bill number link */}
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[11px] tracking-tight">{b.bill_no}</span>
                    </td>
                    <td className="px-4 py-4 font-sans font-semibold text-slate-800 dark:text-zinc-200">
                      <div>{b.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">Method: {b.payment_method}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-500">
                      <div>{b.date}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{b.time}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-900 dark:text-white font-sans font-semibold">
                      {b.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-indigo-600 dark:text-indigo-400 text-xs text-nowrap">
                      {formatCurrency(b.grand_total)}
                    </td>
                    
                    {/* Controls alignment */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* reprint thermal */}
                        <button
                          onClick={() => onReprint(b)}
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Reprint POS thermal"
                        >
                          <Printer size={13} />
                        </button>

                        {/* Open ReportLab PDF URL out */}
                        <button
                          onClick={() => handleOpenPDF(b)}
                          className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                          title="Invoice PDF"
                        >
                          <FileText size={13} />
                        </button>

                        {/* Delete profile */}
                        <button
                          onClick={() => handleDelete(b.bill_no)}
                          className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Void bill"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
