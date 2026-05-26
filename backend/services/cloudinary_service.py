import logging
import cloudinary
import cloudinary.uploader
from backend.config.config import Config

logger = logging.getLogger(__name__)

class CloudinaryService:
    def __init__(self):
        self.is_configured = False
        if Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY and Config.CLOUDINARY_API_SECRET:
            try:
                cloudinary.config(
                    cloud_name=Config.CLOUDINARY_CLOUD_NAME,
                    api_key=Config.CLOUDINARY_API_KEY,
                    api_secret=Config.CLOUDINARY_API_SECRET,
                    secure=True
                )
                self.is_configured = True
                logger.info("Cloudinary Service Configured successfully!")
            except Exception as ex:
                logger.error(f"Failed to configure Cloudinary SDK: {ex}")
        else:
            logger.warning("Cloudinary environment credentials missing. PDF receipts will be served locally in Sandbox mode.")

    def upload_pdf(self, file_path, public_id):
        """
        Uploads local receipt file to Cloudinary cloud hosting.
        If Cloudinary is not configured, it returns a simulated secure local path.
        """
        if not self.is_configured:
            logger.info("Cloudinary not configured. Simulating secure invoice URL upload.")
            return f"/api/static/pdfs/{public_id}.pdf"
            
        try:
            upload_result = cloudinary.uploader.upload(
                file_path,
                public_id=f"kr_store_receipts/{public_id}",
                resource_type="raw"
            )
            logger.info(f"PDF uploaded to Cloudinary! Public ID: {public_id}")
            return upload_result.get("secure_url")
        except Exception as e:
            logger.error(f"Error transferring file draft to Cloudinary: {e}")
            return f"/api/static/pdfs/{public_id}.pdf"

# Instantiate service singleton
cloudinary_service = CloudinaryService()
