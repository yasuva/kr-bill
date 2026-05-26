import os
from flask import Flask, jsonify
from flask_cors import CORS
from backend.config.config import Config
from backend.routes.auth_routes import auth_bp
from backend.routes.bill_routes import bill_bp
from backend.routes.dashboard_routes import dash_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure Flask-CORS to permit terminal-to-server POS billing cross access
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Register Modular Blueprints directly to match the exact URL schemas requested 
    # (e.g., POST /login, POST /create_bill, GET /get_bills)
    app.register_blueprint(auth_bp, url_prefix="")
    app.register_blueprint(bill_bp, url_prefix="")
    app.register_blueprint(dash_bp, url_prefix="")
    
    # Root status probe helper
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "KR Store Billing POS Server",
            "status": "online",
            "version": "1.0.0",
            "worldwide_support": "active",
            "engine": "Flask REST API"
        }), 200

    return app

app_instance = create_app()

if __name__ == "__main__":
    # Standard binder default for Cloud environments like Render
    port = int(os.environ.get("PORT", 5000))
    app_instance.run(host="0.0.0.0", port=port, debug=False)
