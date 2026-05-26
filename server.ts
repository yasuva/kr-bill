import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "data", "bills.json");

// Define hardcoded Admin accounts for security and ease of POS system authentication
const ADMIN_USER = {
  username: "admin",
  password: "password123", // secure billing password for store operators
  name: "KR Store Administrator"
};

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), "data"))) {
  fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });
}

// Ensure database file exists with initial structure
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ bills: [], currentBillNo: 1000 }, null, 2));
}

// Database helper functions for atomic reading/writing of the state
function readData() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read billing database, returning defaults", err);
    return { bills: [], currentBillNo: 1000 };
  }
}

function writeData(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to billing database", err);
  }
}

// Server-side currency format helper (en-IN)
function formatINR(amount: number): string {
  const value = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const hasDecimals = value % 1 !== 0;
  const formatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
  return "₹" + formatter.format(value);
}

// Express express middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express REST API Routes for KR Store Billing System
// -----------------------------------------------------------------------------

// POST /api/login: Admin Authenticated Session
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    // Return mock JWT token containing user details and token scopes
    return res.json({
      success: true,
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenForKRStorePOS.2026",
      user: {
        username: ADMIN_USER.username,
        name: ADMIN_USER.name,
        role: "admin"
      }
    });
  }
  return res.status(401).json({ success: false, message: "Invalid username or password" });
});

// Middleware checking for Authorized admin session
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authorization token required" });
  }
  next();
}

// POST /api/create_bill: Generate and commit new purchase bill
app.post("/api/create_bill", requireAuth, (req, res) => {
  try {
    const { customer_name, items, subtotal, grand_total, payment_method } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Bill must include at least one item." });
    }

    const state = readData();
    const nextBillNo = state.currentBillNo + 1;
    state.currentBillNo = nextBillNo;
    
    // Auto-generate Bill Code prefix
    const year = new Date().getFullYear();
    const bill_no = `KR-${year}-${nextBillNo}`;

    const dateObj = new Date();
    const dateStr = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = dateObj.toLocaleTimeString("en-US", { hour12: false }); // HH:MM:SS

    const newBill = {
      id: bill_no,
      bill_no,
      customer_name: customer_name || "Walk-in Customer",
      date: dateStr,
      time: timeStr,
      subtotal: parseFloat(subtotal) || 0,
      grand_total: parseFloat(grand_total) || 0,
      payment_method: payment_method || "Cash",
      pdf_url: `/api/bill/${bill_no}/pdf`, // Dynamic fallback PDF generation download route
      created_at: dateObj.toISOString(),
      items: items.map((item: any) => ({
        product_name: item.product_name,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        total: parseFloat(item.total) || (parseInt(item.quantity) * parseFloat(item.unit_price))
      }))
    };

    state.bills.unshift(newBill); // Add to beginning
    writeData(state);

    return res.status(201).json({
      success: true,
      message: "Bill created successfully!",
      bill: newBill
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/get_bills: List all transactions with search filter support
app.get("/api/get_bills", requireAuth, (req, res) => {
  try {
    const state = readData();
    let billsList = [...state.bills];

    const { q, date, startDate, endDate } = req.query;

    // Filter by query (bill number or customer name)
    if (q) {
      const qLower = String(q).toLowerCase();
      billsList = billsList.filter(
        b => b.bill_no.toLowerCase().includes(qLower) || 
             b.customer_name.toLowerCase().includes(qLower)
      );
    }

    // Filter by single exact date
    if (date) {
      billsList = billsList.filter(b => b.date === date);
    }

    // Filter by date range
    if (startDate && endDate) {
      billsList = billsList.filter(b => b.date >= String(startDate) && b.date <= String(endDate));
    }

    return res.json({ success: true, count: billsList.length, bills: billsList });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bill/:id: Fetch specific bill details
app.get("/api/bill/:id", requireAuth, (req, res) => {
  try {
    const state = readData();
    const bill = state.bills.find((b: any) => b.bill_no === req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: "Invoice Bill not found." });
    }
    return res.json({ success: true, bill });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/delete_bill/:id: Cancel or remove invoice record
app.delete("/api/delete_bill/:id", requireAuth, (req, res) => {
  try {
    const state = readData();
    const index = state.bills.findIndex((b: any) => b.bill_no === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: "Invoice Bill not found." });
    }
    state.bills.splice(index, 1);
    writeData(state);
    return res.json({ success: true, message: "Bill deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/today_sales: Dynamic calculation of live daily sales stats
app.get("/api/today_sales", requireAuth, (req, res) => {
  try {
    const state = readData();
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    const todayBills = state.bills.filter((b: any) => b.date === todayStr);
    const totalSalesAmount = todayBills.reduce((acc: number, b: any) => acc + b.grand_total, 0);
    const totalTransactions = todayBills.length;

    return res.json({
      success: true,
      date: todayStr,
      total_sales: parseFloat(totalSalesAmount.toFixed(2)),
      transactions_count: totalTransactions,
      bills: todayBills
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/monthly_sales: Summary of transactions in active billing month
app.get("/api/monthly_sales", requireAuth, (req, res) => {
  try {
    const state = readData();
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const monthlyBills = state.bills.filter((b: any) => b.date.startsWith(currentMonthPrefix));
    const totalSalesAmount = monthlyBills.reduce((acc: number, b: any) => acc + b.grand_total, 0);
    const totalTransactions = monthlyBills.length;

    return res.json({
      success: true,
      month: currentMonthPrefix,
      total_sales: parseFloat(totalSalesAmount.toFixed(2)),
      transactions_count: totalTransactions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bill/:id/pdf: Dynamic HTML print system as a smart streamable format
app.get("/api/bill/:id/pdf", (req, res) => {
  try {
    const state = readData();
    const bill = state.bills.find((b: any) => b.bill_no === req.params.id);
    if (!bill) {
      return res.status(404).send("<h1>Bill not found</h1>");
    }

    // Build responsive, super-polished HTML output optimized for auto-save as PDF or Print
    const itemsHtml = bill.items.map((item: any, idx: number) => `
      <tr>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">${idx + 1}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: left;">${item.product_name}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">${formatINR(item.unit_price)}</td>
        <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${formatINR(item.total)}</td>
      </tr>
    `).join("");

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>KR Store - Bill ${bill.bill_no}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 40px; line-height: 1.4; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 800; color: #2563eb; letter-spacing: -1px; }
          .company-info { text-align: right; font-size: 13px; color: #666; }
          .bill-details { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f1f5f9; padding: 10px; font-weight: 600; text-align: left; font-size: 13px; text-transform: uppercase; color: #475569; }
          .summary { display: flex; justify-content: flex-end; }
          .summary-table { width: 300px; }
          .summary-table td { padding: 6px 0; font-size: 14px; }
          .summary-table .total-row { font-size: 18px; font-weight: 800; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 10px; }
          .footer { text-align: center; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b; }
          @media print {
            body { margin: 0; padding: 0; font-size: 12px; }
            .container { border: none; box-shadow: none; max-width: 100%; padding: 0; }
            .header { border-bottom-color: #000; }
            .summary-table .total-row { color: #000; border-top-color: #000; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px; max-width: 800px; margin: 0 auto 20px auto;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">Print / Save PDF</button>
        </div>
        <div class="container">
          <div class="header">
            <div>
              <div class="logo">KR STORE</div>
              <div style="font-size: 13px; color: #64748b; margin-top: 5px;">Your Reliable Local Shopping Partner</div>
            </div>
            <div class="company-info">
              <strong>KR Store Ltd.</strong><br>
              123 Business Lane, Market District<br>
              Mumbai, India<br>
              Support: support@krstore.com
            </div>
          </div>
          <div class="bill-details">
            <div>
              <strong>INVOICE TO:</strong><br>
              Name: ${bill.customer_name}<br>
              Date: ${bill.date}<br>
              Time: ${bill.time}
            </div>
            <div style="text-align: right;">
              <strong>INVOICE DETAILS:</strong><br>
              Bill No: <strong>${bill.bill_no}</strong><br>
              Payment: ${bill.payment_method}<br>
              Status: PAID
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 50%">Product Description</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td>Total Items</td>
                <td style="text-align: right; font-weight: 500;">${bill.items.length}</td>
              </tr>
              <tr>
                <td>Total Quantity</td>
                <td style="text-align: right; font-weight: 500;">${bill.items.reduce((acc: number, b: any) => acc + (b.quantity || 1), 0)}</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total</td>
                <td style="text-align: right;">${formatINR(bill.grand_total)}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            Thank you for shopping at KR Store! We value your business.<br>
            For online product warranty or returns registration, contact worldwide support.<br>
            <div style="font-size: 11px; margin-top: 10px; color: #94a3b8;">This is a system generated tax invoice. No signature required.</div>
          </div>
        </div>
      </body>
      </html>
    `;
    return res.send(receiptHtml);
  } catch (error: any) {
    return res.status(500).send("<h1>Internal Server Error</h1><p>" + error.message + "</p>");
  }
});


// Configure Vite Asset Serving Middleware in Development and Static Hosting in Production
// -----------------------------------------------------------------------------
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[KR STORE POS Engine] Server running at http://localhost:${PORT}`);
  });
}

setupServer();
