"""
🔧 MASTER FIX SCRIPT: Complete Mapping Pipeline Repair
=======================================================

This script executes the complete fix process:
1. Verify the pipeline fix is in place
2. Clean all mapping data
3. Re-extract all companies
4. Validate results

Author: Senior Data Engineer
Date: December 28, 2025
"""

import subprocess
import sys
from pathlib import Path


def print_header(title):
    print("\n" + "="*100)
    print(f"  {title}")
    print("="*100)


def run_script(script_name, description):
    """Run a Python script and return success status"""
    print_header(description)

    try:
        result = subprocess.run(
            [sys.executable, script_name],
            capture_output=False,
            text=True,
            check=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Script failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print(f"\n❌ Error running script: {e}")
        return False


def check_pipeline_fix():
    """Verify the pipeline code has been fixed"""
    print_header("STEP 0: Verifying Pipeline Fix")

    pipeline_file = Path("master_row_mapping_pipeline.py")

    if not pipeline_file.exists():
        print(f"❌ Pipeline file not found: {pipeline_file}")
        return False

    with open(pipeline_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check for the bug pattern
    if "text_to_first_index[normalized_txt] = row['row_index']" in content:
        print(f"❌ BUG STILL PRESENT in pipeline code!")
        print(
            f"   Found: text_to_first_index[normalized_txt] = row['row_index']")
        print(f"   This line should have been removed!")
        return False

    # Check for the fix pattern
    if "text_to_cluster = {text: idx for idx, text in enumerate(unique_texts_ordered)}" in content:
        print(f"✅ Pipeline fix detected!")
        print(f"   Found: Sequential cluster assignment code")
        return True

    print(f"⚠️  Could not verify fix - please check pipeline code manually")
    return False


def main():
    """Execute the complete fix process"""
    print("\n" + "="*100)
    print("🔧 MASTER FIX SCRIPT: Complete Mapping Pipeline Repair")
    print("="*100)
    print("\nThis will:")
    print("  1. Verify pipeline code fix")
    print("  2. Clean all mapping data")
    print("  3. Re-extract all companies")
    print("  4. Validate results")
    print("\nEstimated time: 60-90 minutes")

    response = input("\n🚀 Start the fix process? (yes/no): ")

    if response.lower() != 'yes':
        print("\n❌ Fix process cancelled by user.")
        return

    # Step 0: Verify fix
    if not check_pipeline_fix():
        print("\n❌ Pipeline fix verification failed!")
        print("   Please ensure master_row_mapping_pipeline.py has been fixed.")
        return

    # Step 1: Cleanup
    if not run_script("cleanup_all_mappings.py", "STEP 1: Cleaning Mapping Data"):
        print("\n❌ Cleanup failed! Cannot proceed.")
        return

    # Step 2: Re-extract
    if not run_script("reextract_all_companies.py", "STEP 2: Re-extracting All Companies"):
        print("\n❌ Re-extraction failed! Check errors above.")
        print("   You can manually run: python reextract_all_companies.py")
        return

    # Step 3: Validate
    print_header("STEP 3: Validating Results")

    validation_scripts = [
        ("validate_mapping_correctness.py", "Technical Validation"),
        ("check_all_companies_mappings.py", "Logical Validation"),
    ]

    all_valid = True
    for script, desc in validation_scripts:
        print(f"\n📋 Running: {desc}")
        if not run_script(script, desc):
            all_valid = False

    # Final summary
    print_header("✅ FIX PROCESS COMPLETE")

    if all_valid:
        print(f"\n🎉 SUCCESS!")
        print(f"\n✅ Pipeline fixed")
        print(f"✅ Data cleaned")
        print(f"✅ Companies re-extracted")
        print(f"✅ Validations passed")
        print(f"\nThe system is now ready for production use!")
    else:
        print(f"\n⚠️  PROCESS COMPLETED WITH WARNINGS")
        print(f"\n✅ Pipeline fixed")
        print(f"✅ Data cleaned")
        print(f"✅ Companies re-extracted")
        print(f"⚠️  Some validations failed - please review")

    print("\n" + "="*100 + "\n")


if __name__ == "__main__":
    main()
