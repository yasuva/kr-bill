import datetime
import jwt
from flask import Blueprint, request, jsonify
from backend.config.config import Config

auth_bp = Blueprint("auth", __name__)

# Mock Single Hardcoded Store Admin credentials
STORE_ADMIN = {
    "username": "admin",
    "password": "password123", # standard POS billing credentials
    "name": "KR Store Administrator"
}

def generate_jwt_token(username, role="admin"):
    """Generates a secure admin authorization token with custom expirations"""
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    payload = {
        "exp": expiration,
        "iat": datetime.datetime.utcnow(),
        "sub": username,
        "role": role,
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def token_required(f):
    """Decorator to protect POS transaction APIs from unauthorized access"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"success": False, "message": "Access token is missing!"}), 401

        try:
            data = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
            # Inject authenticated admin user to request context
            request.current_user = data["sub"]
        except jwt.ExpiredSignatureError:
            return jsonify({"success": False, "message": "Access token has expired!"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"success": False, "message": "Access token is invalid!"}), 401

        return f(*args, **kwargs)
    return decorated


@auth_bp.route("/login", methods=["POST"])
def login():
    """POST /auth/login: Handle POS cashier authentication session"""
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required!"}), 400

    if username == STORE_ADMIN["username"] and password == STORE_ADMIN["password"]:
        token = generate_jwt_token(username)
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "username": username,
                "name": STORE_ADMIN["name"],
                "role": "admin"
            }
        }), 200

    return jsonify({"success": False, "message": "Invalid password or cashier key"}), 401
