import datetime
from flask import Blueprint, jsonify
from backend.routes.auth_routes import token_required
from backend.services.firebase_service import firebase_service

dash_bp = Blueprint("dashboard", __name__)

@dash_bp.route("/today_sales", methods=["GET"])
@token_required
def today_sales():
    """GET /today_sales: Return summed grand total of all sales booked today"""
    try:
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        
        # Pull transactions from database
        bills_ref = firebase_service.db.collection("bills")
        docs = bills_ref.get()
        
        sum_total = 0.0
        count = 0
        matching_bills = []

        for doc in docs:
            b_data = doc.to_dict() if hasattr(doc, "to_dict") else doc._data
            if b_data.get("date") == today_str:
                sum_total += float(b_data.get("grand_total", 0.0))
                count += 1
                matching_bills.append(b_data)

        return jsonify({
            "success": True,
            "date": today_str,
            "total_sales": float(round(sum_total, 2)),
            "transactions_count": count,
            "bills": matching_bills
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@dash_bp.route("/monthly_sales", methods=["GET"])
@token_required
def monthly_sales():
    """GET /monthly_sales: Return financial sum of sales booked in current Month"""
    try:
        current_month_prefix = datetime.datetime.now().strftime("%Y-%m")
        
        bills_ref = firebase_service.db.collection("bills")
        docs = bills_ref.get()
        
        sum_total = 0.0
        count = 0

        for doc in docs:
            b_data = doc.to_dict() if hasattr(doc, "to_dict") else doc._data
            if b_data.get("date", "").startswith(current_month_prefix):
                sum_total += float(b_data.get("grand_total", 0.0))
                count += 1

        return jsonify({
            "success": True,
            "month": current_month_prefix,
            "total_sales": float(round(sum_total, 2)),
            "transactions_count": count
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
