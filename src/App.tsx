import React, { useState, useEffect } from "react";
import { ShoppingBag, LayoutDashboard, Moon, Sun, LogOut, Terminal, BellRing, Sparkles, Monitor, KeyRound } from "lucide-react";
import { Bill, AuthenticatedUser, ToastMessage } from "./types";
import BillingScreen from "./components/BillingScreen";
import AdminDashboard from "./components/AdminDashboard";
import AdminLogin from "./components/AdminLogin";
import ThermalReceipt from "./components/ThermalReceipt";

export default function App() {
  // Session Authentication state
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  
  // Navigation active tab index (billing, dashboard)
  const [activeTab, setActiveTab] = useState<"billing" | "dashboard">("billing");
  
  // Global theme switcher (default to light mode POS standard)
  const [darkMode, setDarkMode] = useState(false);
  
  // Custom interactive popup notifications list
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Reprints receipt selector modal state
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  // 1. Initial page boot - authenticate existing cashiers
  useEffect(() => {
    const authSession = async () => {
      const { apiService } = await import("./services/api");
      const user = apiService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    };
    authSession();
  }, []);

  // 2. Handle theme toggling class injection
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Toast dynamic trigger utility
  const handleToast = (text: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, text }]);
    
    // Automatically fade out after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = async () => {
    const { apiService } = await import("./services/api");
    apiService.logout();
    setCurrentUser(null);
    handleToast("Logged out of billing terminal safely.", "success");
  };

  return (
    <div id="root-theme-container" className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 pb-16 transition-colors duration-200`}>
      
      {/* Dynamic Toast Alert Portal Banners */}
      <div id="toast-portal-portal" className="fixed top-5 right-5 z-55 space-y-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border pointer-events-auto animate-fade-in ${
              toast.type === "success"
                ? "bg-emerald-500 border-emerald-400 text-white"
                : toast.type === "error"
                ? "bg-rose-500 border-rose-450 text-white"
                : "bg-slate-900 border-slate-700 text-white"
            }`}
          >
            <BellRing size={16} className="shrink-0 animate-bounce" />
            <span className="text-xs font-bold leading-5">{toast.text}</span>
          </div>
        ))}
      </div>

      {/* Main header navbar banner */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tighter shadow-sm">
              KR
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block uppercase">
                KR <span className="text-indigo-600 dark:text-indigo-400 font-black">Store</span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono -mt-1 block uppercase tracking-wider">
                WORLDWIDE SUPPORT ACTIVE
              </span>
            </div>
          </div>

          {/* User authenticated cashier action bars */}
          {currentUser && (
            <div className="hidden sm:flex items-center bg-slate-150/70 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("billing")}
                className={`flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "billing"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 border border-transparent"
                }`}
              >
                <ShoppingBag size={14} />
                Billing Station
              </button>
              
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 border border-transparent"
                }`}
              >
                <LayoutDashboard size={14} />
                Sales Dashboard
              </button>
            </div>
          )}

          {/* Quick settings toolbar icons */}
          <div className="flex items-center gap-3">
            {/* Dark mode switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Contrast"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User credentials profile panel info */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-3 block">
                    Staff role: Cashier
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Secure logout session"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                <KeyRound size={12} />
                Lockout status
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main scrolling core contents wrapper */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {!currentUser ? (
          // Admin Security Login Card if unauthorized
          <AdminLogin
            onLoginSuccess={(user) => setCurrentUser(user)}
            onToast={(text, type) => handleToast(text, type)}
          />
        ) : (
          <div className="space-y-8">
            {/* Small Mobile tab quick toggle icons */}
            <div className="flex sm:hidden p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1.5">
              <button
                onClick={() => setActiveTab("billing")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "billing"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <ShoppingBag size={14} />
                Billing
              </button>
              
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "dashboard"
                    ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-extrabold"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
            </div>

            {/* Render Tab states dynamically */}
            {activeTab === "billing" ? (
              <BillingScreen
                onBillCreated={(bill) => {
                  setActiveReceiptBill(bill);
                  handleToast(`Bill ${bill.bill_no} created successfully.`, "success");
                }}
                onToast={(text, type) => handleToast(text, type as any)}
              />
            ) : (
              <AdminDashboard
                onReprint={(bill) => setActiveReceiptBill(bill)}
                onToast={(text, type) => handleToast(text, type as any)}
              />
            )}
          </div>
        )}
      </main>

      {/* Print preview Modal thermal block */}
      {activeReceiptBill && (
        <ThermalReceipt
          bill={activeReceiptBill}
          onClose={() => setActiveReceiptBill(null)}
          onToast={(text, type) => handleToast(text, type)}
        />
      )}
    </div>
  );
}
