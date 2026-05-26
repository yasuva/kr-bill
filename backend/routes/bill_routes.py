import os
import io
import uuid
import datetime
from flask import Blueprint, request, jsonify, send_file
from backend.routes.auth_routes import token_required
from backend.services.firebase_service import firebase_service
from backend.pdf.generator import generate_invoice_pdf

bill_bp = Blueprint("bill", __name__)

# Track bill counter sequentially in local memory when database starts
BILL_ID_COUNTER = 1000

@bill_bp.route("/create_bill", methods=["POST"])
@token_required
def create_bill():
    """POST /create_bill: Compile invoice, generate PDF, upload, and save transaction"""
    global BILL_ID_COUNTER
    data = request.json or {}
    
    # Validation checks
    customer_name = data.get("customer_name", "Walk-in Customer")
    items = data.get("items", [])
    subtotal = data.get("subtotal")
    grand_total = data.get("grand_total")
    payment_method = data.get("payment_method", "Cash")

    if not items or subtotal is None or grand_total is None:
        return jsonify({"success": False, "message": "Missing core invoice fields like items, subtotal or totals"}), 400

    # Auto-generate unique bill ID
    BILL_ID_COUNTER += 1
    year = datetime.datetime.now().year
    bill_no = f"KR-{year}-{BILL_ID_COUNTER}"

    # Set timestamps
    now = datetime.datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    # Build structured bill item mapping
    bill_payload = {
        "bill_no": bill_no,
        "customer_name": customer_name,
        "date": date_str,
        "time": time_str,
        "subtotal": float(subtotal),
        "grand_total": float(grand_total),
        "payment_method": payment_method,
        "created_at": now.isoformat(),
        "items": []
    }

    # Map each transaction purchase purchase item
    for item in items:
        p_name = item.get("product_name")
        qty = int(item.get("quantity", 1))
        unit_p = float(item.get("unit_price", 0.0))
        tot = float(item.get("total", qty * unit_p))
        
        bill_payload["items"].append({
            "product_name": p_name,
            "quantity": qty,
            "unit_price": unit_p,
            "total": tot
        })

    # Set local dynamic endpoint URL for PDF retrieval on demand
    bill_payload["pdf_url"] = f"/api/bill/{bill_no}/pdf"

    try:
        # Set structured record in Firebase Firestore database
        firebase_service.db.collection("bills").document(bill_no).set(bill_payload)
                
        return jsonify({
            "success": True,
            "message": "Bill registered successfully",
            "bill": bill_payload
        }), 201

    except Exception as db_ex:
        return jsonify({
            "success": False,
            "message": f"Failed committing transaction to Firestore: {db_ex}"
        }), 500


@bill_bp.route("/get_bills", methods=["GET"])
@token_required
def get_bills():
    """GET /get_bills: Fetch list of records. Supports filtering by date or customer query."""
    try:
        q = request.args.get("q", "")
        date = request.args.get("date", "")
        
        # Query list from Firestore
        bills_ref = firebase_service.db.collection("bills")
        docs = bills_ref.get()
        
        results = []
        for doc in docs:
            b_data = doc.to_dict() if hasattr(doc, "to_dict") else doc._data
            
            # Apply matching criteria
            if date and b_data.get("date") != date:
                continue
            if q:
                q_lower = q.lower()
                num_match = q_lower in b_data.get("bill_no", "").lower()
                name_match = q_lower in b_data.get("customer_name", "").lower()
                if not (num_match or name_match):
                    continue
                    
            results.append(b_data)

        # Sort with latest transactions first
        results.sort(key=lambda b: b.get("created_at", ""), reverse=True)
        return jsonify({"success": True, "count": len(results), "bills": results}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bill_bp.route("/bill/<id>", methods=["GET"])
@token_required
def get_bill_detail(id):
    """GET /bill/<id>: Retrieve absolute document record from Firebase"""
    try:
        doc_ref = firebase_service.db.collection("bills").document(id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"success": False, "message": "Bill transaction record not found"}), 404
            
        return jsonify({"success": True, "bill": doc.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bill_bp.route("/delete_bill/<id>", methods=["DELETE"])
@token_required
def delete_bill(id):
    """DELETE /delete_bill/<id>: Revoke or drop transaction log"""
    try:
        doc_ref = firebase_service.db.collection("bills").document(id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return jsonify({"success": False, "message": "Bill transaction record not found"}), 404
            
        doc_ref.delete()
        return jsonify({"success": True, "message": "Transaction bill profile deleted successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@bill_bp.route("/api/bill/<bill_no>/pdf", methods=["GET"])
def get_bill_pdf_url(bill_no):
    """
    GET /api/bill/<bill_no>/pdf: Checks Firebase for the bill data,
    renders the professional invoice as a ReportLab PDF, and returns
    the binary PDF file directly to the browser (for viewing, printing, or downloading)
    without using any third-party clouds or CDNs.
    """
    try:
        # 1. Retrieve the bill document from Firebase Firestore
        doc_ref = firebase_service.db.collection("bills").document(bill_no)
        doc_snap = doc_ref.get()
        
        if not doc_snap.exists:
            return "<h1>Bill not found in database.</h1>", 404
            
        bill_data = doc_snap.to_dict() if hasattr(doc_snap, "to_dict") else getattr(doc_snap, "_data", {})
        
        # 2. Dynamic PDF creation path
        temp_pdf_name = f"invoice_{bill_no}.pdf"
        temp_pdf_path = os.path.join("/tmp" if os.name != "nt" else "C:\\temp", temp_pdf_name)
        
        # Ensure temporary directory exists
        os.makedirs(os.path.dirname(temp_pdf_path), exist_ok=True)
        
        try:
            generate_invoice_pdf(bill_data, temp_pdf_path)
        except Exception as pdf_ex:
            return f"<h1>Failed compiling ReportLab PDF: {str(pdf_ex)}</h1>", 500

        # 3. Read PDF file into memory buffer and remove file from disk
        if not os.path.exists(temp_pdf_path):
            return "<h1>Failed to save generated PDF on server.</h1>", 500
            
        with open(temp_pdf_path, 'rb') as f:
            pdf_data = f.read()
            
        try:
            os.remove(temp_pdf_path)
        except Exception as rm_ex:
            print(f"Warning: could not sweep temporary PDF draft: {rm_ex}")
            
        # 4. Stream PDF file directly from memory to allow viewing and PDF printing in browser
        return send_file(
            io.BytesIO(pdf_data),
            mimetype="application/pdf",
            as_attachment=False,
            download_name=f"invoice_{bill_no}.pdf"
        )

    except Exception as general_ex:
        return f"<h1>Internal Server Error: {str(general_ex)}</h1>", 500

