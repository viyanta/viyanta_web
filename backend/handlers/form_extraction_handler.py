"""
Form Extraction Handler
Main handler for the complete form extraction workflow
"""
import json
from pathlib import Path
from typing import Dict
from fastapi import HTTPException

from services.template_resolver import TemplateResolver
from services.extraction_orchestrator import ExtractionOrchestrator
from services.database_storage_service import DatabaseStorageService
from helpers.extraction_metadata import ExtractionMetadataHelper


class FormExtractionHandler:
    """
    Main handler that coordinates the complete extraction workflow:
    1. Template resolution
    2. PDF extraction
    3. Gemini verification
    4. Database storage
    5. Metadata management
    """

    def __init__(self, pdf_splitter_service):
        self.pdf_splitter = pdf_splitter_service
        self.template_resolver = TemplateResolver()
        self.extraction_orchestrator = ExtractionOrchestrator()
        self.db_storage = DatabaseStorageService()
        self.metadata_helper = ExtractionMetadataHelper()

    def extract_form(
        self,
        company_name: str,
        pdf_name: str,
        split_filename: str,
        user_id: str
    ) -> Dict[str, any]:
        """
        Complete form extraction workflow

        Args:
            company_name: Name of the company
            pdf_name: Name of the PDF file
            split_filename: Name of the split PDF file
            user_id: ID of the user requesting extraction

        Returns:
            {
                'success': bool,
                'extraction_id': str,
                'data': normalized data array,
                'metadata': extraction metadata dict,
                'error': str (if failed)
            }
        """
        try:
            print(f"\n{'='*80}")
            print(f"🎯 FORM EXTRACTION STARTED")
            print(f"{'='*80}")
            print(f"📊 Company: {company_name}")
            print(f"📄 PDF: {pdf_name}")
            print(f"📋 Split: {split_filename}")
            print(f"👤 User: {user_id}")
            print(f"{'='*80}\n")

            # Step 1: Get split file path
            split_path = self._get_split_file_path(
                company_name, pdf_name, split_filename)

            # Step 2: Resolve template
            template_result = self._resolve_template(
                company_name,
                pdf_name,
                split_filename
            )

            # Step 3: Create output directories
            extractions_dir, gemini_dir = self.extraction_orchestrator.create_output_directories(
                company_name,
                pdf_name
            )

            # Step 4: Define output paths
            extracted_json = extractions_dir / \
                f"{Path(split_filename).stem}_extracted.json"
            corrected_json = gemini_dir / \
                f"{Path(split_filename).stem}_corrected.json"

            # Step 5: Run extraction
            extraction_result = self._run_extraction(
                template_result['template_path'],
                split_path,
                extracted_json
            )

            # Step 6: Run Gemini verification
            gemini_result = self._run_gemini_verification(
                template_result['template_path'],
                extracted_json,
                split_path,
                corrected_json,
                extraction_result['row_count']
            )

            # Step 7: Load and normalize final data
            final_data = self._load_final_data(gemini_result['output_path'])
            normalized_data = self.extraction_orchestrator.normalize_extracted_data(
                final_data)

            # Step 8: Store in database
            db_result = self._store_in_database(
                company_name,
                pdf_name,
                template_result['form_code'],
                normalized_data
            )

            # Step 9: Auto-create master mappings (for L-forms only)
            mapping_result = self._create_master_mappings(
                company_name,
                template_result['form_code'],
                db_result
            )

            # Step 10: Create and save metadata
            metadata = self._create_metadata(
                user_id=user_id,
                company_name=company_name,
                pdf_name=pdf_name,
                split_filename=split_filename,
                split_pdf_path=split_path,
                form_code=template_result['form_code'],
                template_path=template_result['template_path'],
                gemini_corrected=gemini_result['gemini_corrected'],
                output_path=gemini_result['output_path'],
                correction_notes=gemini_result['correction_notes']
            )

            self.metadata_helper.save_metadata(
                metadata, extractions_dir, split_filename)

            print(f"\n{'='*80}")
            print(f"✅ FORM EXTRACTION COMPLETED SUCCESSFULLY")
            print(f"{'='*80}\n")

            return {
                'success': True,
                'extraction_id': metadata['extraction_id'],
                'data': normalized_data,
                'metadata': metadata
            }

        except HTTPException:
            raise
        except Exception as e:
            error_msg = f"Form extraction failed: {str(e)}"
            print(f"\n{'='*80}")
            print(f"❌ FORM EXTRACTION FAILED")
            print(f"❌ Error: {error_msg}")
            print(f"{'='*80}\n")

            raise HTTPException(status_code=500, detail=error_msg)

    def _get_split_file_path(self, company_name: str, pdf_name: str, split_filename: str) -> str:
        """Get the full path to the split PDF file"""
        print(f"\n📂 Step 1: Locating split file...")

        split_path = self.pdf_splitter.get_split_file_path(
            company_name,
            pdf_name,
            split_filename
        )

        if not split_path or not Path(split_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Split file not found: {split_filename}"
            )

        print(f"✅ Split file located: {split_path}")
        return split_path

    def _resolve_template(
        self,
        company_name: str,
        pdf_name: str,
        split_filename: str
    ) -> Dict:
        """Resolve the template for the form"""
        print(f"\n🔍 Step 2: Resolving template...")

        # Get stored form code from splits metadata
        splits = self.pdf_splitter.get_pdf_splits(company_name, pdf_name)
        split_info = next(
            (s for s in splits if s["filename"] == split_filename),
            None
        )

        stored_form_code = split_info.get(
            "form_code", "") if split_info else ""

        # Resolve template
        template_result = self.template_resolver.resolve_template(
            company_name,
            split_filename,
            stored_form_code
        )

        if not template_result['success']:
            error_detail = template_result['error']
            if 'available_forms' in template_result:
                available = template_result['available_forms']
                error_detail += f"\nAvailable forms: {', '.join(available)}"

            raise HTTPException(status_code=404, detail=error_detail)

        print(f"✅ Template resolved: {template_result['template_name']}")
        print(f"   Form Code: {template_result['form_code']}")
        print(f"   Template Path: {template_result['template_path']}")

        return template_result

    def _run_extraction(
        self,
        template_path: Path,
        split_path: str,
        output_path: Path
    ) -> Dict:
        """Run PDF extraction"""
        print(f"\n🔧 Step 3: Running PDF extraction...")

        result = self.extraction_orchestrator.run_extraction(
            template_path,
            split_path,
            output_path
        )

        if not result['success']:
            raise HTTPException(
                status_code=500,
                detail=f"Extraction failed: {result['error']}"
            )

        print(f"✅ Extraction completed")
        print(f"   Output: {result['output_path']}")
        print(f"   Rows extracted: {result['row_count']}")

        return result

    def _run_gemini_verification(
        self,
        template_path: Path,
        extracted_json: Path,
        split_path: str,
        corrected_json: Path,
        row_count: int
    ) -> Dict:
        """Run Gemini verification"""
        print(f"\n🤖 Step 4: Running Gemini verification...")

        result = self.extraction_orchestrator.run_gemini_verification(
            template_path,
            extracted_json,
            split_path,
            corrected_json,
            row_count
        )

        if not result['success']:
            print(f"⚠️ Gemini verification had issues, using extracted data")

        status = "✅ Verified" if result['gemini_corrected'] else "⚠️ Skipped/Failed"
        print(f"{status} Gemini verification")
        print(f"   Output: {result['output_path']}")
        print(f"   Corrected: {result['gemini_corrected']}")

        return result

    def _load_final_data(self, output_path: Path) -> any:
        """Load final JSON data"""
        print(f"\n📥 Step 5: Loading final data...")

        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            print(f"✅ Data loaded from: {output_path}")
            return data

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to load extracted data: {str(e)}"
            )

    def _store_in_database(
        self,
        company_name: str,
        pdf_name: str,
        form_code: str,
        normalized_data: any
    ) -> Dict:
        """Store extraction results in database"""
        print(f"\n💾 Step 6: Storing in database...")

        result = self.db_storage.store_extraction_results(
            company_name,
            pdf_name,
            form_code,
            normalized_data
        )

        if not result['success']:
            print(f"⚠️ Database storage failed: {result['error']}")
        else:
            print(f"✅ Database storage completed")
            print(f"   Company ID: {result.get('company_id')}")
            print(f"   Reports created: {result.get('rows_inserted', 0)}")

        return result

    def _create_master_mappings(
        self,
        company_name: str,
        form_code: str,
        db_result: Dict
    ) -> Dict:
        """
        Auto-create master mappings for L-form data

        This runs a lightweight, targeted version of the master mapping pipeline
        specifically for the newly inserted data.
        """
        print(f"\n🗺️ Step 7: Creating master mappings...")

        # Only run for L-forms
        if not form_code or not form_code.upper().startswith('L-'):
            print(f"⏭️ Skipping master mapping (not an L-form: {form_code})")
            return {'success': True, 'skipped': True, 'reason': 'not_lform'}

        # Check if storage was successful
        if not db_result.get('success'):
            print(f"⏭️ Skipping master mapping (storage failed)")
            return {'success': False, 'skipped': True, 'reason': 'storage_failed'}

        try:
            from master_row_mapping_pipeline import MasterMappingPipeline

            # Get company_id and report_ids from storage result
            company_id = db_result.get('company_id')
            report_ids = db_result.get('report_ids', [])

            if not company_id or not report_ids:
                print(f"⚠️ No company_id or report_ids found, skipping master mapping")
                return {'success': True, 'skipped': True, 'reason': 'no_identifiers'}

            print(f"   Company ID: {company_id}")
            print(f"   Report IDs: {report_ids}")
            print(f"   Form Code: {form_code}")

            # Initialize mapper (no config needed - uses existing database connection)
            mapper = MasterMappingPipeline()

            # Run targeted master mapping for these specific reports only
            result = mapper.run_targeted_mapping(
                company_id=company_id,
                report_ids=report_ids,
                form_code=form_code
            )

            if result['success']:
                print(f"✅ Master mapping completed")
                print(
                    f"   Master rows created: {result.get('master_rows_created', 0)}")
                print(f"   Rows mapped: {result.get('rows_mapped', 0)}")

                # Auto-sync master_rows table
                try:
                    from services.master_rows_sync_service import MasterRowsSyncService

                    print(f"\n🔄 Auto-syncing master_rows table...")
                    sync_service = MasterRowsSyncService()
                    sync_result = sync_service.sync_master_rows(
                        form_no=form_code,
                        company_id=company_id,
                        verbose=False
                    )

                    if sync_result['success']:
                        print(
                            f"✅ Master rows synced: {sync_result['rows_synced']} clusters")
                    else:
                        print(
                            f"⚠️ Master rows sync failed: {sync_result.get('error', 'Unknown')}")
                except Exception as sync_error:
                    print(f"⚠️ Master rows sync error: {sync_error}")
                    # Don't fail if sync fails
            else:
                print(
                    f"⚠️ Master mapping failed: {result.get('error', 'Unknown error')}")

            return result

        except ImportError as e:
            print(f"⚠️ Master mapping pipeline not available: {e}")
            return {'success': True, 'skipped': True, 'reason': 'pipeline_not_available'}
        except Exception as e:
            print(f"⚠️ Master mapping error: {e}")
            # Don't fail the entire extraction if mapping fails
            return {'success': False, 'error': str(e), 'non_critical': True}

    def _create_metadata(self, **kwargs) -> Dict:
        """Create extraction metadata"""
        print(f"\n📋 Step 8: Creating metadata...")

        metadata = self.metadata_helper.create_metadata(**kwargs)

        print(f"✅ Metadata created")
        print(f"   Extraction ID: {metadata['extraction_id']}")

        return metadata
