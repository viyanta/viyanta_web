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

    def upload_pdf_file(self, local_file_path: str, user_id: str, folder_name: str, filename: str, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload PDF file to S3 with vifiles bucket structure

        Args:
            local_file_path: Path to the local PDF file
            user_id: User ID for organizing files by user
            folder_name: Folder name for organizing files
            filename: Original filename
            metadata: Optional metadata to attach to the file

        Returns:
            Dict with upload results
        """
        try:
            # S3 path: vifiles/users/{user_id}/{folder_name}/pdf/{filename}
            s3_key = f"users/{user_id}/{folder_name}/pdf/{filename}"

            extra_args = {
                'Metadata': {
                    'user_id': user_id,
                    'folder_name': folder_name,
                    'upload_timestamp': datetime.now().isoformat(),
                    'file_type': 'pdf',
                    **(metadata or {})
                }
            }

            self.s3_client.upload_file(
                local_file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )

            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded PDF to S3: {s3_url}")

            return {
                "success": True,
                "s3_key": s3_key,
                "bucket": self.bucket_name,
                "url": s3_url,
                "file_type": "pdf"
            }

        except Exception as e:
            logger.error(f"Failed to upload PDF to S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_type": "pdf"
            }

    def upload_json_extraction(self, json_data: Dict[Any, Any], user_id: str, folder_name: str, filename: str, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload JSON extraction data to S3 with vifiles bucket structure

        Args:
            json_data: Dictionary containing extraction data
            user_id: User ID for organizing files by user
            folder_name: Folder name for organizing files
            filename: JSON filename (should end with .json)
            metadata: Optional metadata to attach to the file

        Returns:
            Dict with upload results
        """
        try:
            # S3 path: vifiles/users/{user_id}/{folder_name}/json/{filename}
            s3_key = f"users/{user_id}/{folder_name}/json/{filename}"

            # Convert JSON to string
            json_str = json.dumps(json_data, indent=2,
                                  default=str, ensure_ascii=False)

            extra_args = {
                'ContentType': 'application/json',
                'Metadata': {
                    'user_id': user_id,
                    'folder_name': folder_name,
                    'upload_timestamp': datetime.now().isoformat(),
                    'file_type': 'json',
                    **(metadata or {})
                }
            }

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=json_str.encode('utf-8'),
                **extra_args
            )

            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded JSON to S3: {s3_url}")

            return {
                "success": True,
                "s3_key": s3_key,
                "bucket": self.bucket_name,
                "url": s3_url,
                "file_type": "json"
            }

        except Exception as e:
            logger.error(f"Failed to upload JSON to S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_type": "json"
            }

    def upload_file(self, local_file_path: str, s3_key: str, metadata: Optional[Dict[str, str]] = None, user_id: str = None) -> str:
        """
        Legacy upload method for backward compatibility

        Args:
            local_file_path: Path to the local file
            s3_key: S3 object key (path in bucket)
            metadata: Optional metadata to attach to the file
            user_id: User ID for organizing files by user

        Returns:
            S3 URL of the uploaded file
        """
        try:
            # Organize by user if user_id provided
            if user_id:
                final_s3_key = f"users/{user_id}/{s3_key}"
            else:
                final_s3_key = s3_key

            extra_args = {}
            if metadata:
                extra_args['Metadata'] = metadata

            self.s3_client.upload_file(
                local_file_path,
                self.bucket_name,
                final_s3_key,
                ExtraArgs=extra_args
            )

            s3_url = f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{final_s3_key}"
            logger.info(f"Successfully uploaded file to S3: {s3_url}")
            return s3_url

        except Exception as e:
            logger.error(f"Failed to upload file to S3: {str(e)}")
            raise

    def upload_json_data(self, data: Dict[Any, Any], s3_key: str, metadata: Optional[Dict[str, str]] = None, user_id: str = None) -> str:
        """
        Upload JSON data directly to S3 with user-based organization

        Args:
            data: Dictionary to upload as JSON
            s3_key: S3 object key (path in bucket)
            metadata: Optional metadata to attach to the file
            user_id: User ID for organizing files by user

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
                result = self.upload_file(
                    temp_file_path, s3_key, metadata, user_id)
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

    def list_user_folders(self, user_id: str) -> Dict[str, Any]:
        """
        List all folders for a specific user in vifiles bucket

        Args:
            user_id: User ID to list folders for

        Returns:
            Dict with folder list and metadata
        """
        try:
            prefix = f"users/{user_id}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                Delimiter='/'
            )

            folders = []
            if 'CommonPrefixes' in response:
                for prefix_info in response['CommonPrefixes']:
                    folder_path = prefix_info['Prefix']
                    folder_name = folder_path.replace(
                        f"users/{user_id}/", "").rstrip('/')
                    if folder_name:
                        # Get folder metadata
                        pdf_count = self._count_files_in_folder(
                            user_id, folder_name, "pdf")
                        json_count = self._count_files_in_folder(
                            user_id, folder_name, "json")

                        folders.append({
                            "folder_name": folder_name,
                            "pdf_count": pdf_count,
                            "json_count": json_count,
                            "s3_prefix": folder_path
                        })

            logger.info(f"Listed {len(folders)} folders for user {user_id}")
            return {
                "success": True,
                "user_id": user_id,
                "folders": folders,
                "total_folders": len(folders)
            }

        except Exception as e:
            logger.error(f"Failed to list user folders from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "user_id": user_id,
                "folders": []
            }

    def list_user_folder_files(self, user_id: str, folder_name: str) -> Dict[str, Any]:
        """
        List all files in a specific user folder

        Args:
            user_id: User ID
            folder_name: Folder name to list files from

        Returns:
            Dict with file list and metadata
        """
        try:
            # List PDF files
            pdf_prefix = f"users/{user_id}/{folder_name}/pdf/"
            json_prefix = f"users/{user_id}/{folder_name}/json/"

            pdf_response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=pdf_prefix
            )

            json_response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=json_prefix
            )

            # Create file mapping
            files = []
            pdf_files = {}
            json_files = {}

            # Process PDF files
            if 'Contents' in pdf_response:
                for obj in pdf_response['Contents']:
                    filename = obj['Key'].replace(pdf_prefix, '')
                    if filename:  # Skip directory entries
                        pdf_files[filename] = {
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat(),
                            's3_key': obj['Key']
                        }

            # Process JSON files
            if 'Contents' in json_response:
                for obj in json_response['Contents']:
                    filename = obj['Key'].replace(json_prefix, '')
                    if filename:  # Skip directory entries
                        json_files[filename] = {
                            'size': obj['Size'],
                            'last_modified': obj['LastModified'].isoformat(),
                            's3_key': obj['Key']
                        }

            # Combine PDF and JSON info
            for pdf_filename, pdf_info in pdf_files.items():
                json_filename = pdf_filename.replace('.pdf', '.json')
                has_json = json_filename in json_files

                file_info = {
                    'filename': pdf_filename,
                    'type': 'pdf',
                    'size': pdf_info['size'],
                    'last_modified': pdf_info['last_modified'],
                    'pdf_s3_key': pdf_info['s3_key'],
                    'has_json': has_json,
                    'json_s3_key': json_files[json_filename]['s3_key'] if has_json else None
                }
                files.append(file_info)

            logger.info(
                f"Listed {len(files)} files for user {user_id} in folder {folder_name}")
            return {
                "success": True,
                "user_id": user_id,
                "folder_name": folder_name,
                "files": files,
                "total_files": len(files)
            }

        except Exception as e:
            logger.error(f"Failed to list user folder files from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "user_id": user_id,
                "folder_name": folder_name,
                "files": []
            }

    def get_json_file_content(self, user_id: str, folder_name: str, filename: str) -> Dict[str, Any]:
        """
        Get JSON file content from S3

        Args:
            user_id: User ID
            folder_name: Folder name
            filename: JSON filename

        Returns:
            Dict with JSON content
        """
        try:
            s3_key = f"users/{user_id}/{folder_name}/json/{filename}"

            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            content = response['Body'].read().decode('utf-8')
            json_data = json.loads(content)

            logger.info(f"Successfully retrieved JSON content: {s3_key}")
            return {
                "success": True,
                "s3_key": s3_key,
                "data": json_data
            }

        except self.s3_client.exceptions.NoSuchKey:
            logger.info(f"JSON file not found in S3: {s3_key}")
            return {
                "success": False,
                "error": "File not found",
                "s3_key": s3_key
            }
        except Exception as e:
            logger.error(f"Failed to get JSON content from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "s3_key": s3_key if 's3_key' in locals() else None
            }

    def _count_files_in_folder(self, user_id: str, folder_name: str, file_type: str) -> int:
        """
        Count files in a specific folder and type

        Args:
            user_id: User ID
            folder_name: Folder name
            file_type: File type ('pdf' or 'json')

        Returns:
            Number of files
        """
        try:
            prefix = f"users/{user_id}/{folder_name}/{file_type}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            if 'Contents' in response:
                # Filter out directory entries
                return len([obj for obj in response['Contents']
                           if not obj['Key'].endswith('/')])
            return 0

        except Exception as e:
            logger.error(f"Failed to count files: {str(e)}")
            return 0

    def list_all_users_data(self) -> Dict[str, Any]:
        """List all users and their data from S3"""
        try:
            # List all objects with the vifiles/users/ prefix
            prefix = "vifiles/users/"
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=prefix,
                Delimiter='/'
            )

            all_users_data = {}

            for page in page_iterator:
                # Get user folders (common prefixes)
                if 'CommonPrefixes' in page:
                    for prefix_info in page['CommonPrefixes']:
                        # Extract user_id from prefix like "vifiles/users/user123/"
                        user_prefix = prefix_info['Prefix']
                        user_id = user_prefix.replace(
                            "vifiles/users/", "").rstrip('/')

                        if user_id:
                            # Get folders for this user
                            user_folders = self.list_user_folders(user_id)
                            if user_folders.get('success'):
                                all_users_data[user_id] = {
                                    'user_id': user_id,
                                    'folders': user_folders.get('folders', []),
                                    'total_folders': len(user_folders.get('folders', []))
                                }

            return {
                "success": True,
                "total_users": len(all_users_data),
                "data": all_users_data
            }

        except Exception as e:
            logger.error(f"Failed to list all users data: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "data": {}
            }


# Create a singleton instance
s3_service = S3Service()
