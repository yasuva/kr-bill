export interface BillItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Bill {
  id: string; // generated client-side or maps directly from backend
  bill_no: string;
  customer_name: string;
  date: string;
  time: string;
  subtotal: number;
  grand_total: number;
  payment_method: string;
  pdf_url: string;
  created_at: string;
  items: BillItem[];
}

export interface SalesToday {
  date: string;
  total_sales: number;
  transactions_count: number;
  bills: Bill[];
}

export interface SalesMonthly {
  month: string;
  total_sales: number;
  transactions_count: number;
}

// Global visual status notification type
export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  text: string;
}

// User credentials structure
export interface AuthenticatedUser {
  username: string;
  name: string;
  role: string;
}
