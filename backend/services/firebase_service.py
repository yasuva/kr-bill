import os
import json
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from backend.config.config import Config

logger = logging.getLogger(__name__)

class FirebaseService:
    _instance = None
    db = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(FirebaseService, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            # Check if already initialized by another route/thread
            if firebase_admin._apps:
                self.db = firestore.client()
                return

            cred = None

            # Pattern A: Initialize using a raw config JSON string in environmental vars
            if Config.FIREBASE_CONFIG_JSON:
                try:
                    cred_dict = json.loads(Config.FIREBASE_CONFIG_JSON)
                    cred = credentials.Certificate(cred_dict)
                    logger.info("Initializing Firebase via direct config JSON string in ENV variables.")
                except Exception as ex:
                    logger.error(f"Failed to load FIREBASE_CONFIG_JSON string: {ex}")

            # Pattern B: Initialize using a local service account JSON credential filepath
            elif Config.FIREBASE_CREDENTIAL_PATH and os.path.exists(Config.FIREBASE_CREDENTIAL_PATH):
                cred = credentials.Certificate(Config.FIREBASE_CREDENTIAL_PATH)
                logger.info(f"Initializing Firebase with certificate file: {Config.FIREBASE_CREDENTIAL_PATH}")

            # Fallback Pattern: Initialize using Default Credentials or run in Sandbox Mock Mode
            if not cred:
                logger.warning("Firebase credentials not configured. Launching Firebase service in Draft Mock Mode.")
                self.db = MockFirestoreClient()
            else:
                app = firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                logger.info("Firebase Firestore client initialized successfully!")

        except Exception as e:
            logger.error(f"Firebase connection setup error: {e}. Falling back to Draft Mock Database.")
            self.db = MockFirestoreClient()


class MockFirestoreClient:
    """Mock database client to allow seamless app running before the user provides production keys"""
    def __init__(self):
        self._store = {}

    def collection(self, name):
        if name not in self._store:
            self._store[name] = MockCollection(name)
        return self._store[name]


class MockCollection:
    def __init__(self, name):
        self.name = name
        self._docs = {}

    def document(self, doc_id=None):
        import uuid
        if not doc_id:
            doc_id = str(uuid.uuid4())
        if doc_id not in self._docs:
            self._docs[doc_id] = MockDocument(doc_id, self)
        return self._docs[doc_id]

    def get(self):
        # Return all documents
        return [doc for doc in self._docs.values()]

    def stream(self):
        return [doc for doc in self._docs.values()]


class MockDocument:
    def __init__(self, doc_id, collection):
        self.id = doc_id
        self._collection = collection
        self._data = {}
        self.exists = False

    def get(self):
        return self

    def to_dict(self):
        return self._data

    def set(self, data, merge=False):
        self._data = data
        self.exists = True
        self._collection._docs[self.id] = self

    def update(self, data):
        self._data.update(data)
        self.exists = True

    def delete(self):
        if self.id in self._collection._docs:
            del self._collection._docs[self.id]
        self.exists = False


# Instantiate service singleton
firebase_service = FirebaseService()
