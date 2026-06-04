"""
Object storage client — supports AWS S3 and Cloudflare R2 (S3-compatible).

Usage:
    from core.storage import storage
    url = await storage.upload_file(file_bytes, "kyc/doc.pdf", "application/pdf")
    download_url = await storage.get_presigned_url("kyc/doc.pdf", expires=3600)
"""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class StorageClient:
    """
    Async-compatible S3/R2 storage client.

    Reads configuration from environment variables:
      AWS_ACCESS_KEY_ID       — access key (works for both AWS and R2)
      AWS_SECRET_ACCESS_KEY   — secret key
      AWS_S3_BUCKET_NAME      — bucket name
      AWS_S3_REGION           — region (e.g. ap-south-1 for AWS, auto for R2)
      R2_ENDPOINT_URL         — set this for Cloudflare R2, leave empty for AWS
    """

    def __init__(self) -> None:
        self.access_key = os.environ.get("AWS_ACCESS_KEY_ID", "")
        self.secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
        self.bucket = os.environ.get("AWS_S3_BUCKET_NAME", "")
        self.region = os.environ.get("AWS_S3_REGION", "us-east-1")
        self.endpoint_url = os.environ.get("R2_ENDPOINT_URL")  # None = use AWS
        self._client = None

    def _get_client(self):
        """Lazily create the boto3 S3 client."""
        if self._client is None:
            try:
                import boto3
                kwargs = {
                    "aws_access_key_id": self.access_key,
                    "aws_secret_access_key": self.secret_key,
                    "region_name": self.region,
                }
                if self.endpoint_url:
                    kwargs["endpoint_url"] = self.endpoint_url
                self._client = boto3.client("s3", **kwargs)
            except ImportError:
                logger.warning("boto3 not installed — storage operations will fail")
                return None
        return self._client

    def upload_file(
        self,
        file_bytes: bytes,
        key: str,
        content_type: str = "application/octet-stream",
    ) -> Optional[str]:
        """
        Upload bytes to storage and return the object key.

        Parameters
        ----------
        file_bytes:
            Raw file content.
        key:
            Object key / path in the bucket (e.g. 'kyc/tenant-id/doc.pdf').
        content_type:
            MIME type of the file.

        Returns
        -------
        str | None
            The object key on success, None on failure.
        """
        client = self._get_client()
        if not client or not self.bucket:
            logger.warning("Storage not configured — skipping upload for key: %s", key)
            return None

        try:
            client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            logger.info("Uploaded file to storage: %s", key)
            return key
        except Exception as exc:
            logger.error("Storage upload failed for key %s: %s", key, exc)
            return None

    def get_presigned_url(self, key: str, expires: int = 3600) -> Optional[str]:
        """
        Generate a presigned download URL for a stored object.

        Parameters
        ----------
        key:
            Object key in the bucket.
        expires:
            URL expiry in seconds (default 1 hour).

        Returns
        -------
        str | None
            Presigned URL on success, None on failure.
        """
        client = self._get_client()
        if not client or not self.bucket:
            return None

        try:
            url = client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires,
            )
            return url
        except Exception as exc:
            logger.error("Failed to generate presigned URL for %s: %s", key, exc)
            return None

    def delete_file(self, key: str) -> bool:
        """Delete an object from storage. Returns True on success."""
        client = self._get_client()
        if not client or not self.bucket:
            return False

        try:
            client.delete_object(Bucket=self.bucket, Key=key)
            logger.info("Deleted file from storage: %s", key)
            return True
        except Exception as exc:
            logger.error("Storage delete failed for key %s: %s", key, exc)
            return False


# Module-level singleton
storage = StorageClient()
