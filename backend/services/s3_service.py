"""
AWS S3 Service for File Management
Handles uploading, downloading, and managing files in S3
"""

import boto3
import os
import json
from typing import Optional, Dict, Any
from datetime import datetime
import tempfile
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class S3Service:
    """Service for handling AWS S3 operations"""

    def __init__(self):
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = os.getenv("S3_BUCKET_NAME")
        self.region = os.getenv("S3_REGION")

        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name, self.region]):
            raise ValueError("Missing required AWS S3 environment variables")

        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region
        )

        # Verify bucket exists
        self._verify_bucket()

    def _verify_bucket(self):
        """Verify that the S3 bucket exists and is accessible"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(
                f"Successfully connected to S3 bucket: {self.bucket_name}")
        except Exception as e:
            logger.error(
                f"Failed to access S3 bucket {self.bucket_name}: {str(e)}")
            raise

    def upload_file(self, local_file_path: str, s3_key: str, metadata: Optional[Dict[str, str]] = None) -> str:
        """
        Upload a file to S3

        Args:
            local_file_path: Path to the local file
            s3_key: S3 object key (path in bucket)
            metadata: Optional metadata to attach to the file

        Returns:
            S3 URL of the uploaded file
        """
        try:
            extra_args = {}
            if metadata:
                extra_args['Metadata'] = metadata

            self.s3_client.upload_file(
                local_file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )

            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded file to S3: {s3_url}")
            return s3_url

        except Exception as e:
            logger.error(f"Failed to upload file to S3: {str(e)}")
            raise

    def upload_json_data(self, data: Dict[Any, Any], s3_key: str, metadata: Optional[Dict[str, str]] = None) -> str:
        """
        Upload JSON data directly to S3

        Args:
            data: Dictionary to upload as JSON
            s3_key: S3 object key (path in bucket)
            metadata: Optional metadata to attach to the file

        Returns:
            S3 URL of the uploaded file
        """
        try:
            # Create a temporary file with JSON data
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                json.dump(data, temp_file, indent=2, default=str)
                temp_file_path = temp_file.name

            try:
                # Upload the temporary file
                result = self.upload_file(temp_file_path, s3_key, metadata)
                return result
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)

        except Exception as e:
            logger.error(f"Failed to upload JSON data to S3: {str(e)}")
            raise

    def download_file(self, s3_key: str, local_file_path: str):
        """
        Download a file from S3

        Args:
            s3_key: S3 object key (path in bucket)
            local_file_path: Path where to save the downloaded file
        """
        try:
            self.s3_client.download_file(
                self.bucket_name, s3_key, local_file_path)
            logger.info(f"Successfully downloaded file from S3: {s3_key}")
        except Exception as e:
            logger.error(f"Failed to download file from S3: {str(e)}")
            raise

    def download_file_content(self, s3_key: str) -> Optional[str]:
        """
        Download file content as string

        Args:
            s3_key: S3 object key (path in bucket)

        Returns:
            File content as string, or None if file doesn't exist
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name, Key=s3_key)
            content = response['Body'].read().decode('utf-8')
            logger.info(
                f"Successfully downloaded file content from S3: {s3_key}")
            return content
        except self.s3_client.exceptions.NoSuchKey:
            logger.info(f"File not found in S3: {s3_key}")
            return None
        except Exception as e:
            logger.error(f"Failed to download file content from S3: {str(e)}")
            raise

    def get_file_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for accessing a file

        Args:
            s3_key: S3 object key (path in bucket)
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            raise

    def list_files(self, prefix: str = "") -> list:
        """
        List files in S3 bucket with optional prefix

        Args:
            prefix: Prefix to filter files

        Returns:
            List of file keys
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            files = []
            if 'Contents' in response:
                files = [obj['Key'] for obj in response['Contents']]

            return files
        except Exception as e:
            logger.error(f"Failed to list files in S3: {str(e)}")
            raise

    def delete_file(self, s3_key: str):
        """
        Delete a file from S3

        Args:
            s3_key: S3 object key (path in bucket)
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Successfully deleted file from S3: {s3_key}")
        except Exception as e:
            logger.error(f"Failed to delete file from S3: {str(e)}")
            raise

    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3

        Args:
            s3_key: S3 object key (path in bucket)

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except:
            return False


# Create a singleton instance
s3_service = S3Service()
