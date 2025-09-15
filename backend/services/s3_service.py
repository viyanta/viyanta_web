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

        if not all([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name, self.region]) and any([self.aws_access_key_id, self.aws_secret_access_key, self.bucket_name, self.region]):
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
        """List all users and their data from S3 bucket"""
        try:
            # Use the correct prefix based on your S3 structure: "users/"
            prefix = "users/"

            # Add debug info for troubleshooting
            s3_debug = {
                "bucket_name": self.bucket_name,
                "region": self.region,
                "prefix_used": prefix
            }

            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                Delimiter='/',
                MaxKeys=1000
            )

            # Add response debug info
            s3_debug.update({
                "objects_found": response.get("KeyCount", 0),
                "common_prefixes_count": len(response.get("CommonPrefixes", [])),
                "is_truncated": response.get("IsTruncated", False)
            })

            all_users_data = {}
            user_prefixes = []

            # Get user folders from CommonPrefixes
            if 'CommonPrefixes' in response:
                for prefix_info in response['CommonPrefixes']:
                    # Extract user_id from prefix like "users/user123/"
                    user_prefix = prefix_info['Prefix']
                    user_id = user_prefix.replace("users/", "").rstrip('/')

                    if user_id:
                        user_prefixes.append(user_id)
                        logger.info(f"Found user in S3: {user_id}")

                        # Get detailed folder info for this user
                        user_data = self._get_user_data_from_s3(user_id)
                        if user_data:
                            all_users_data[user_id] = user_data

            # Fallback: If no CommonPrefixes, scan objects directly
            if not user_prefixes and 'Contents' in response:
                logger.info(
                    "No CommonPrefixes found, scanning objects directly...")
                derived_users = set()

                for obj in response['Contents']:
                    key = obj['Key']
                    # Extract user_id from keys like "users/user123/folder/..."
                    parts = key.split('/')
                    if len(parts) >= 2 and parts[0] == "users":
                        user_id = parts[1]
                        if user_id:
                            derived_users.add(user_id)

                user_prefixes = list(derived_users)
                s3_debug["derived_users"] = user_prefixes

                for user_id in user_prefixes:
                    user_data = self._get_user_data_from_s3(user_id)
                    if user_data:
                        all_users_data[user_id] = user_data

            s3_debug["detected_users"] = user_prefixes
            logger.info(f"Total users found in S3: {len(all_users_data)}")

            return {
                "success": True,
                "total_users": len(all_users_data),
                "users_data": all_users_data,
                "s3_data": {},  # For compatibility
                "s3_debug": s3_debug
            }

        except Exception as e:
            logger.error(f"Failed to list all users data from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "total_users": 0,
                "users_data": {},
                "s3_data": {},
                "s3_debug": {
                    "error": str(e),
                    "bucket_name": getattr(self, 'bucket_name', 'unknown'),
                    "region": getattr(self, 'region', 'unknown')
                }
            }

    def upload_file_new_structure(self, local_file_path: str, folder_name: str, file_name: str, file_type: str, metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload file to S3 with new folder structure: vifiles/{folder_name}/{file_name}_{file_type}/

        Args:
            local_file_path: Path to the local file
            folder_name: Folder name (from upload)
            file_name: Base filename (without extension)
            file_type: Type of file ('original', 'json', 'verified_json')
            metadata: Optional metadata to attach to the file

        Returns:
            Dict with upload results
        """
        try:
            # Determine file extension based on type
            if file_type == 'original':
                file_extension = os.path.splitext(local_file_path)[1]
                s3_key = f"{folder_name}/{file_name}/{os.path.basename(local_file_path)}"
            elif file_type == 'json':
                s3_key = f"{folder_name}/{file_name}_json/{file_name}.json"
            elif file_type == 'verified_json':
                s3_key = f"{folder_name}/{file_name}_verified_json/{file_name}_verified.json"
            else:
                raise ValueError(f"Invalid file_type: {file_type}")

            extra_args = {
                'Metadata': {
                    'folder_name': folder_name,
                    'file_name': file_name,
                    'file_type': file_type,
                    'upload_timestamp': datetime.now().isoformat(),
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
            logger.info(
                f"Successfully uploaded {file_type} file to S3: {s3_url}")

            return {
                "success": True,
                "s3_key": s3_key,
                "bucket": self.bucket_name,
                "url": s3_url,
                "file_type": file_type
            }

        except Exception as e:
            logger.error(f"Failed to upload {file_type} file to S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_type": file_type
            }

    def download_file_new_structure(self, folder_name: str, file_name: str, file_type: str, local_path: str) -> Dict[str, Any]:
        """
        Download file from S3 with new folder structure

        Args:
            folder_name: Folder name
            file_name: Base filename (without extension)
            file_type: Type of file ('original', 'json', 'verified_json')
            local_path: Local path to save the file

        Returns:
            Dict with download results
        """
        try:
            # Construct S3 key based on file type
            if file_type == 'original':
                # For original files, we need to find the actual filename
                s3_key = f"{folder_name}/{file_name}/"
                # List objects to find the actual file
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=s3_key
                )
                if 'Contents' in response and response['Contents']:
                    s3_key = response['Contents'][0]['Key']
                else:
                    raise FileNotFoundError(
                        f"Original file not found for {file_name}")
            elif file_type == 'json':
                s3_key = f"{folder_name}/{file_name}_json/{file_name}.json"
            elif file_type == 'verified_json':
                s3_key = f"{folder_name}/{file_name}_verified_json/{file_name}_verified.json"
            else:
                raise ValueError(f"Invalid file_type: {file_type}")

            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                local_path
            )

            logger.info(
                f"Successfully downloaded {file_type} file from S3: {s3_key}")
            return {
                "success": True,
                "s3_key": s3_key,
                "local_path": local_path,
                "file_type": file_type
            }

        except Exception as e:
            logger.error(
                f"Failed to download {file_type} file from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_type": file_type
            }

    def list_folders_new_structure(self) -> Dict[str, Any]:
        """
        List all folders in the new S3 structure (vifiles/{folder_name}/)

        Returns:
            Dict with list of folders and their contents
        """
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=self.bucket_name,
                Delimiter='/'
            )

            folders = {}

            for page in page_iterator:
                # Get folder names (common prefixes)
                if 'CommonPrefixes' in page:
                    for prefix_info in page['CommonPrefixes']:
                        folder_name = prefix_info['Prefix'].rstrip('/')

                        # Get folder contents
                        folder_contents = self._get_folder_contents_new_structure(
                            folder_name)
                        folders[folder_name] = folder_contents

            return {
                "success": True,
                "total_folders": len(folders),
                "folders": folders
            }

        except Exception as e:
            logger.error(f"Failed to list folders: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "folders": {}
            }

    def _get_folder_contents_new_structure(self, folder_name: str) -> Dict[str, Any]:
        """
        Get contents of a folder in the new structure

        Args:
            folder_name: Name of the folder

        Returns:
            Dict with folder contents organized by file types
        """
        try:
            prefix = f"{folder_name}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            files = {
                "original": [],
                "json": [],
                "verified_json": []
            }

            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    relative_path = key[len(prefix):]

                    # Categorize files based on their path structure
                    if '/' in relative_path:
                        subfolder, filename = relative_path.split('/', 1)
                        if subfolder.endswith('_json') and not subfolder.endswith('_verified_json'):
                            files["json"].append({
                                "key": key,
                                "filename": filename,
                                "size": obj['Size'],
                                "last_modified": obj['LastModified'].isoformat()
                            })
                        elif subfolder.endswith('_verified_json'):
                            files["verified_json"].append({
                                "key": key,
                                "filename": filename,
                                "size": obj['Size'],
                                "last_modified": obj['LastModified'].isoformat()
                            })
                        else:
                            # This is an original file
                            files["original"].append({
                                "key": key,
                                "filename": filename,
                                "size": obj['Size'],
                                "last_modified": obj['LastModified'].isoformat()
                            })

            return {
                "folder_name": folder_name,
                "total_files": len(files["original"]) + len(files["json"]) + len(files["verified_json"]),
                "original_files": files["original"],
                "json_files": files["json"],
                "verified_json_files": files["verified_json"]
            }

        except Exception as e:
            logger.error(
                f"Failed to get folder contents for {folder_name}: {str(e)}")
            return {
                "folder_name": folder_name,
                "total_files": 0,
                "original_files": [],
                "json_files": [],
                "verified_json_files": [],
                "error": str(e)
            }

    def get_file_content_new_structure(self, folder_name: str, file_name: str, file_type: str) -> Dict[str, Any]:
        """
        Get file content from S3 with new folder structure

        Args:
            folder_name: Folder name
            file_name: Base filename (without extension)
            file_type: Type of file ('original', 'json', 'verified_json')

        Returns:
            Dict with file content
        """
        try:
            # Construct S3 key based on file type
            if file_type == 'json':
                s3_key = f"{folder_name}/{file_name}_json/{file_name}.json"
            elif file_type == 'verified_json':
                s3_key = f"{folder_name}/{file_name}_verified_json/{file_name}_verified.json"
            else:
                raise ValueError(
                    f"Cannot get content for file_type: {file_type}")

            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )

            content = response['Body'].read().decode('utf-8')

            if file_type in ['json', 'verified_json']:
                content = json.loads(content)

            return {
                "success": True,
                "content": content,
                "s3_key": s3_key,
                "file_type": file_type
            }

        except Exception as e:
            logger.error(
                f"Failed to get {file_type} content from S3: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file_type": file_type
            }

    def _get_user_data_from_s3(self, user_id: str) -> Dict[str, Any]:
        """
        Get detailed user data from S3 including all folders and files

        Args:
            user_id: User ID to get data for

        Returns:
            Dict with user data structure
        """
        try:
            user_prefix = f"users/{user_id}/"

            # List all folders for this user
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=user_prefix,
                Delimiter='/',
                MaxKeys=1000
            )

            folders = []

            # Get folders from CommonPrefixes
            if 'CommonPrefixes' in response:
                for prefix_info in response['CommonPrefixes']:
                    folder_prefix = prefix_info['Prefix']
                    folder_name = folder_prefix.replace(
                        user_prefix, "").rstrip('/')

                    if folder_name:
                        # Get folder details
                        folder_data = self._get_folder_data_from_s3(
                            user_id, folder_name)
                        if folder_data:
                            folders.append(folder_data)

            # If no CommonPrefixes, scan objects to derive folders
            if not folders:
                response_objects = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=user_prefix,
                    MaxKeys=1000
                )

                derived_folders = set()
                if 'Contents' in response_objects:
                    for obj in response_objects['Contents']:
                        key = obj['Key']
                        relative_path = key.replace(user_prefix, "")
                        if '/' in relative_path:
                            folder_name = relative_path.split('/')[0]
                            if folder_name:
                                derived_folders.add(folder_name)

                for folder_name in derived_folders:
                    folder_data = self._get_folder_data_from_s3(
                        user_id, folder_name)
                    if folder_data:
                        folders.append(folder_data)

            return {
                "user_id": user_id,
                "total_folders": len(folders),
                "folders": folders
            }

        except Exception as e:
            logger.error(f"Failed to get user data for {user_id}: {str(e)}")
            return None

    def _get_folder_data_from_s3(self, user_id: str, folder_name: str) -> Dict[str, Any]:
        """
        Get detailed folder data from S3 including file listings

        Args:
            user_id: User ID
            folder_name: Folder name

        Returns:
            Dict with folder data structure
        """
        try:
            folder_prefix = f"users/{user_id}/{folder_name}/"

            # List all files in this folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder_prefix,
                MaxKeys=1000
            )

            files = []
            pdf_count = 0
            json_count = 0
            folder_created_at = None

            if 'Contents' in response:
                # Group files by base name and type for enhanced naming convention
                file_groups = {}  # base_name -> {original_pdf, extracted_json, gemini_verified_json}

                for obj in response['Contents']:
                    key = obj['Key']
                    filename = os.path.basename(key)
                    relative_path = key.replace(folder_prefix, "")

                    # Skip directory entries
                    if not filename:
                        continue

                    # Track earliest creation time as folder creation time
                    if folder_created_at is None or obj['LastModified'] < folder_created_at:
                        folder_created_at = obj['LastModified']

                    # Parse new naming convention
                    if filename.endswith('_original_uploaded.pdf'):
                        base_name = filename.replace(
                            '_original_uploaded.pdf', '')
                        if base_name not in file_groups:
                            file_groups[base_name] = {}
                        file_groups[base_name]['original_pdf'] = {
                            'filename': filename,
                            'size': obj['Size'],
                            'created_at': obj['LastModified'].isoformat(),
                            's3_key': key,
                            'type': 'original_pdf'
                        }
                        pdf_count += 1

                    elif filename.endswith('_json_extracted.json'):
                        base_name = filename.replace(
                            '_json_extracted.json', '')
                        if base_name not in file_groups:
                            file_groups[base_name] = {}
                        file_groups[base_name]['extracted_json'] = {
                            'filename': filename,
                            'size': obj['Size'],
                            'created_at': obj['LastModified'].isoformat(),
                            's3_key': key,
                            'type': 'extracted_json'
                        }
                        json_count += 1

                    elif filename.endswith('_json_gemini_verified.json'):
                        base_name = filename.replace(
                            '_json_gemini_verified.json', '')
                        if base_name not in file_groups:
                            file_groups[base_name] = {}
                        file_groups[base_name]['gemini_verified_json'] = {
                            'filename': filename,
                            'size': obj['Size'],
                            'created_at': obj['LastModified'].isoformat(),
                            's3_key': key,
                            'type': 'gemini_verified_json'
                        }
                        json_count += 1

                    # Handle legacy files for backward compatibility
                    elif filename.lower().endswith('.pdf') and not filename.endswith('_original_uploaded.pdf'):
                        base_name = os.path.splitext(filename)[0]
                        if base_name not in file_groups:
                            file_groups[base_name] = {}
                        file_groups[base_name]['legacy_pdf'] = {
                            'filename': filename,
                            'size': obj['Size'],
                            'created_at': obj['LastModified'].isoformat(),
                            's3_key': key,
                            'type': 'legacy_pdf'
                        }
                        pdf_count += 1

                    elif filename.lower().endswith('.json') and not any(suffix in filename for suffix in ['_json_extracted.json', '_json_gemini_verified.json']):
                        base_name = os.path.splitext(filename)[0]
                        if base_name not in file_groups:
                            file_groups[base_name] = {}
                        file_groups[base_name]['legacy_json'] = {
                            'filename': filename,
                            'size': obj['Size'],
                            'created_at': obj['LastModified'].isoformat(),
                            's3_key': key,
                            'type': 'legacy_json'
                        }
                        json_count += 1

                # Convert file groups to file list with priority for Gemini verified JSON
                for base_name, file_group in file_groups.items():
                    # Determine best JSON file (priority: gemini_verified > extracted > legacy)
                    best_json = None
                    json_priority = 'none'

                    if 'gemini_verified_json' in file_group:
                        best_json = file_group['gemini_verified_json']
                        json_priority = 'gemini_verified'
                    elif 'extracted_json' in file_group:
                        best_json = file_group['extracted_json']
                        json_priority = 'extracted'
                    elif 'legacy_json' in file_group:
                        best_json = file_group['legacy_json']
                        json_priority = 'legacy'

                    # Determine best PDF file (priority: original > legacy)
                    best_pdf = None
                    if 'original_pdf' in file_group:
                        best_pdf = file_group['original_pdf']
                    elif 'legacy_pdf' in file_group:
                        best_pdf = file_group['legacy_pdf']

                    # Create file entry
                    file_entry = {
                        'base_name': base_name,
                        'json_priority': json_priority,
                        'has_gemini_verification': 'gemini_verified_json' in file_group,
                        'available_files': {
                            k: v for k, v in file_group.items()
                        }
                    }

                    if best_json:
                        file_entry.update({
                            'filename': best_json['filename'],
                            'size': best_json['size'],
                            'created_at': best_json['created_at'],
                            's3_key': best_json['s3_key'],
                            'type': best_json['type']
                        })

                    if best_pdf:
                        file_entry['pdf_info'] = best_pdf

                    files.append(file_entry)

            return {
                'folder_name': folder_name,
                'pdf_count': pdf_count,
                'json_count': json_count,
                'created_at': folder_created_at.isoformat() if folder_created_at else datetime.now().isoformat(),
                'files': files
            }

        except Exception as e:
            logger.error(
                f"Failed to get folder data for {user_id}/{folder_name}: {str(e)}")
            return None


# Create a singleton instance
s3_service = S3Service()
