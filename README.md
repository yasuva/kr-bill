# KR Store Billing System

A high-performance, SaaS-grade Point of Sale (POS) cash register and billing application designed for domestic retail shops with active worldwide customer support.

---

## 🚀 Key Features

### 1. ⚡ Ultra-Fast Cash Billing
* **Instant Keyboard Shortcuts**: Press `F8` to set prompt-focus to the product item entry box, and `F2` to sweep the billing desk instantly.
* **Intelligent Product Matcher**: Interactive autocompletion populated by the store catalog, featuring instant price auto-filling.
* **Multi-Format Quantities**: Sell items in `pcs`, `kg`, `litres`, `box`, `pack`, or `bag` metrics.
* **Variable Discounts & Taxes**: Toggle 18% GST parameters and flat currency deductions with real-time automatic totaling.

### 2. 🧾 Dual Receipt Layouts
* **Compact 58mm Thermal Strip**: Styled monospaced POS printer receipt mockup with virtual paper jagged-serrations and dynamic barcode generation.
* **Corporate Letter Invoices**: Professional invoices compiled and exported as PDFs via the backend.

### 3. 💾 Robust Database & Off-sync Redundancy
* **Offline Cashier Cache**: Transactions are backed up inside the client's local cache on connection loss, allowing POS desks to check out offline.
* **Auto-Save Drafts**: Unfinished carts are backed up instantly, preserving progress through page refreshes.

---

## 🛠️ Dual Technical Architectures

This workspace implements a **seamless, dual backend architecture** to solve deployment requirements:

### Option A: Node.js Express + React (Live Preview Enabled)
* **Hosting**: Configured for Cloud Run/Docker containers, binding to Port `3000`.
* **Database**: Low-latency persistent JSON database store at `/data/bills.json` with auto-incrementing invoice counters.
* **Vite Dev Pipeline**: Connected directly to the frontend compiler to allow hot mock previewing.

### Option B: Python Flask + React (SaaS Production Blueprint)
For scalable cloud deployments (e.g., Frontend on Vercel, Python Backend on Render):
* `/src/*` is ready to build and deploy to Vercel/Netlify.
* `/backend/*` contains a modular, blueprint-driven Flask REST API that integrates with **Google Firebase firestore rules** and **Cloudinary** for PDF transfers.

---

## 📂 Modular Structural Layout

```markdown
├── backend/                    # Python Flask Codebase
│   ├── config/config.py        # Environmental secret variables parser
│   ├── pdf/generator.py        # ReportLab PDF compiled layout designs
│   ├── routes/
│   │   ├── auth_routes.py      # Admin verification & JWT session middleware
│   │   ├── bill_routes.py      # Transaction CRUD pipelines
│   │   └── dashboard_routes.py # Financial aggregates (Daily, Monthly)
│   ├── services/
│   │   └── firebase_service.py # Cloud Firestore SDK connection setups
│   ├── requirements.txt        # Production Python installations lists
│   └── app.py                  # Standard Flask entry driver
│
├── src/                        # React Frontend Core
│   ├── components/
│   │   ├── AdminLogin.tsx      # Secure Cashier credential screen
│   │   ├── BillingScreen.tsx   # POS ledger & cart entry
│   │   ├── AdminDashboard.tsx  # Sales logs details, date filters, delete actions
│   │   └── ThermalReceipt.tsx  # Custom 58mm POS receipt layout
│   ├── services/api.ts         # Client network proxies & cache fallback
│   ├── types.ts                # Shared billing structures
│   └── App.tsx                 # Tab navigation, portal toasts & theme controllers
│
├── server.ts                   # Unified dev Express backend
└── firestore.rules             # Standard zero-trust Firestore security rules
```

---

## 🔒 Firebase Security blueprint Rules

We package Zero-Trust security rules inside `firestore.rules`. Only authorized administrative cashier sessions may perform mutations or scrap listings.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; } // Strict Deny-All Network gate
    
    match /bills/{billId} {
      allow get, list: if request.auth != null;
      allow create, update: if request.auth != null && isValidBill(request.resource.data);
    }
  }
}
```

---

## 📦 Python Deployment (Render)

1. Connect `/backend` to a Render Web Service.
2. Select **Python** runtime and configure Environment Variables:
   * `SECRET_KEY`: Custom secure password.
   * `JWT_SECRET`: Custom JWT signing key.
   * `FIREBASE_CONFIG_JSON` for service account credentials certificates.
3. Render installs requirements via `requirements.txt` and starts the app with:
   `gunicorn backend.app:app_instance`

---

## ⚡ React Frontend Development

Run local development on Port `3000`:
```bash
npm install
npm run dev
```

Build and compile unified full-stack server CJS bundle:
```bash
npm run build
```
The compiled output is located under `/dist` and serves as a stand-alone, high-speed container build!
