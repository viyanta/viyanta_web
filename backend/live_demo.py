"""
LIVE DEMO - Master Rows Management System
==========================================

This demo uses REAL data from your database to show how to:
1. View master rows
2. Search for similar rows
3. Merge master rows
4. Verify the results

Prerequisites:
- Backend server running: uvicorn main:app --reload
- MySQL database with your data
"""

import requests
import json
from tabulate import tabulate

BASE_URL = "http://localhost:8000"


def print_header(title):
    """Print a fancy header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_section(title):
    """Print a section title"""
    print("\n" + "-" * 80)
    print(f"  {title}")
    print("-" * 80)


def format_table(data, headers):
    """Format data as a nice table"""
    return tabulate(data, headers=headers, tablefmt="grid", maxcolwidths=[None, None, 60, 60, None, None])

# ============================================================================
# DEMO START
# ============================================================================


print_header("🎬 MASTER ROWS MANAGEMENT - LIVE DEMO")

print("""
This demo will:
1. ✅ Show current master rows in your database
2. 🔍 Search for rows that match "balance beginn"
3. 🔀 Show how to merge duplicate/similar master rows
4. ✅ Verify the merge succeeded

Let's begin!
""")

input("Press ENTER to start...")

# ============================================================================
# STEP 1: List Current Master Rows
# ============================================================================

print_header("📋 STEP 1: View Current Master Rows")

print("Fetching master rows from database...")
response = requests.get(f"{BASE_URL}/api/master-rows/list?form_no=L-2-A")

if response.status_code != 200:
    print(f"❌ Error: {response.status_code}")
    print(response.text)
    exit(1)

master_rows = response.json()
print(f"✅ Found {len(master_rows)} master rows in L-2-A form\n")

# Show first 10 rows in a nice table
table_data = []
for mr in master_rows[:10]:
    table_data.append([
        mr['master_row_id'],
        mr['cluster_label'],
        mr['master_name'][:50] +
        "..." if len(mr['master_name']) > 50 else mr['master_name'],
        mr['normalized_text'][:50] +
        "..." if len(mr['normalized_text']) > 50 else mr['normalized_text'],
        mr['variant_count'],
        mr['company_count']
    ])

print(format_table(
    table_data,
    ["ID", "Cluster", "Master Name", "Normalized Text", "Variants", "Companies"]
))

print("\n💡 Notice: Some rows might have similar normalized texts")
print("   Example: 'balance beginn period' and 'balance beginn' could be the same item!")

input("\nPress ENTER to continue...")

# ============================================================================
# STEP 2: Search for Specific Master Row
# ============================================================================

print_header("🔍 STEP 2: Search for a Specific Master Row")

# Let's search for "balance" to find the row mentioned by user
search_term = "balance"
print(f"Searching for master rows containing: '{search_term}'")

response = requests.get(
    f"{BASE_URL}/api/master-rows/list?form_no=L-2-A&search={search_term}")

if response.status_code != 200:
    print(f"❌ Error: {response.status_code}")
    exit(1)

search_results = response.json()
print(f"✅ Found {len(search_results)} rows matching '{search_term}'\n")

table_data = []
for mr in search_results:
    table_data.append([
        mr['master_row_id'],
        mr['cluster_label'],
        mr['master_name'][:60] +
        "..." if len(mr['master_name']) > 60 else mr['master_name'],
        mr['normalized_text'],
    ])

print(format_table(
    table_data,
    ["ID", "Cluster", "Master Name", "Normalized Text"]
))

# Pick the first one as our source to demonstrate
if len(search_results) > 0:
    source_row = search_results[0]
    print(f"\n📌 Let's work with master_row_id={source_row['master_row_id']}")
    print(f"   Master Name: {source_row['master_name']}")
    print(f"   Normalized: {source_row['normalized_text']}")
else:
    print("❌ No results found for demo. Using example master_row_id=65")
    source_row = None

input("\nPress ENTER to continue...")

# ============================================================================
# STEP 3: Get Detailed Information
# ============================================================================

if source_row:
    print_header(
        f"📊 STEP 3: Get Details of master_row_id={source_row['master_row_id']}")

    print(f"Fetching detailed information...")
    response = requests.get(
        f"{BASE_URL}/api/master-rows/details/{source_row['master_row_id']}")

    if response.status_code == 200:
        details = response.json()

        print(f"\n✅ Master Row Details:")
        print(f"   ID: {details['master_row']['master_row_id']}")
        print(f"   Cluster: {details['master_row']['cluster_label']}")
        print(f"   Master Name: {details['master_row']['master_name']}")
        print(f"   Total Variants: {details['total_variants']}")
        print(f"   Used in {details['extracted_rows_count']} extracted rows")

        if details['mappings']:
            print(f"\n   Variant Texts:")
            for i, mapping in enumerate(details['mappings'][:5], 1):
                print(f"     {i}. {mapping['variant_text']}")
                print(
                    f"        Company: {mapping['company_id']}, Normalized: {mapping['normalized_text']}")
    else:
        print(f"❌ Error: {response.status_code}")

input("\nPress ENTER to continue...")

# ============================================================================
# STEP 4: Search for Similar Master Rows (Potential Merge Targets)
# ============================================================================

if source_row:
    print_header("🎯 STEP 4: Find Similar Master Rows (Merge Candidates)")

    normalized_text = source_row['normalized_text']
    print(f"Searching for master rows similar to: '{normalized_text}'")

    response = requests.get(
        f"{BASE_URL}/api/master-rows/search-by-normalized-text",
        params={"normalized_text": normalized_text, "form_no": "L-2-A"}
    )

    if response.status_code == 200:
        matches = response.json()

        # Filter out the source itself
        matches = [m for m in matches if m['master_row_id']
                   != source_row['master_row_id']]

        if matches:
            print(f"✅ Found {len(matches)} similar master rows:\n")

            table_data = []
            for match in matches[:5]:
                table_data.append([
                    match['master_row_id'],
                    match['cluster_label'],
                    match['master_name'][:50] +
                    "..." if len(match['master_name']
                                 ) > 50 else match['master_name'],
                    match['normalized_text'][:50] + "..." if len(
                        match['normalized_text']) > 50 else match['normalized_text'],
                    match['match_type'],
                    f"{match['similarity_score']*100:.0f}%"
                ])

            print(format_table(
                table_data,
                ["ID", "Cluster", "Master Name",
                    "Normalized Text", "Match", "Similarity"]
            ))

            print("\n💡 The 'exact' matches are perfect candidates for merging!")
            print("   Fuzzy matches (≥70%) might also be valid merge targets.")

            target_row = matches[0]
        else:
            print("ℹ️  No similar rows found - this master row is unique!")
            target_row = None
    else:
        print(f"❌ Error: {response.status_code}")
        target_row = None

input("\nPress ENTER to continue...")

# ============================================================================
# STEP 5: Demonstrate Merge (DRY RUN - Not Actually Executing)
# ============================================================================

print_header("🔀 STEP 5: Merge Example (DRY RUN)")

if source_row and target_row:
    print("Here's how you would merge master rows:\n")

    print(f"SOURCE (will be deleted):")
    print(f"  ├─ master_row_id: {source_row['master_row_id']}")
    print(f"  ├─ cluster_label: {source_row['cluster_label']}")
    print(f"  ├─ master_name: {source_row['master_name']}")
    print(f"  └─ normalized_text: {source_row['normalized_text']}")

    print(f"\n        ↓ MERGE INTO ↓\n")

    print(f"TARGET (will be kept):")
    print(f"  ├─ master_row_id: {target_row['master_row_id']}")
    print(f"  ├─ cluster_label: {target_row['cluster_label']}")
    print(f"  ├─ master_name: {target_row['master_name']}")
    print(f"  └─ normalized_text: {target_row['normalized_text']}")

    print("\n📝 API Request that would be sent:")
    merge_request = {
        "source_master_row_id": source_row['master_row_id'],
        "target_master_row_id": target_row['master_row_id'],
        "update_normalized_text": target_row['normalized_text']
    }
    print(json.dumps(merge_request, indent=2))

    print("\n🔧 What would happen:")
    print("  1. All master_mapping rows with cluster_label={} → cluster_label={}".format(
        source_row['cluster_label'], target_row['cluster_label']))
    print("  2. All reports_l2_extracted rows with master_row_id={} → master_row_id={}".format(
        source_row['master_row_id'], target_row['master_row_id']))
    print(
        f"  3. Delete master_row_id={source_row['master_row_id']} from master_rows table")
    print("  4. Update normalized_text in master_mapping")

    print("\n⚠️  This is a DRY RUN - no changes were made to the database")
    print("    To actually execute, uncomment the code below:\n")

    print("""
    # UNCOMMENT TO EXECUTE THE MERGE:
    # response = requests.post(
    #     f"{BASE_URL}/api/master-rows/merge",
    #     json={
    #         "source_master_row_id": %d,
    #         "target_master_row_id": %d,
    #         "update_normalized_text": "%s"
    #     }
    # )
    # 
    # if response.status_code == 200:
    #     result = response.json()
    #     print("✅ Merge successful!")
    #     print(json.dumps(result, indent=2))
    # else:
    #     print(f"❌ Error: {response.status_code}")
    """ % (source_row['master_row_id'], target_row['master_row_id'], target_row['normalized_text']))

else:
    print("ℹ️  No merge candidate found for this demo")
    print("\n💡 Example merge using hypothetical IDs:")
    print("""
    POST /api/master-rows/merge
    {
        "source_master_row_id": 65,  // The one you want to remove
        "target_master_row_id": 32,  // The one you want to keep
        "update_normalized_text": "interim dividend paid during period"
    }
    """)

input("\nPress ENTER to continue...")

# ============================================================================
# STEP 6: Show Web UI
# ============================================================================

print_header("🌐 STEP 6: Web UI Access")

print("""
You can also use the graphical web interface!

1. Make sure the server is running:
   cd backend
   uvicorn main:app --reload

2. Open in your browser:
   http://localhost:8000/master-rows-manager

3. The UI provides:
   ✅ Search and filter functionality
   ✅ Visual merge preview
   ✅ One-click merge execution
   ✅ Confirmation dialogs
   ✅ Real-time updates

Try it now! It's much easier than using the API directly.
""")

input("\nPress ENTER to continue...")

# ============================================================================
# DEMO SUMMARY
# ============================================================================

print_header("✅ DEMO COMPLETE!")

print("""
Summary of what you learned:
============================

1. 📋 List Master Rows
   - GET /api/master-rows/list?form_no=L-2-A
   - Filter by form and search term

2. 🔍 Search Similar Rows
   - GET /api/master-rows/search-by-normalized-text?normalized_text=...
   - Returns exact and fuzzy matches (≥70% similarity)

3. 📊 Get Detailed Info
   - GET /api/master-rows/details/{master_row_id}
   - Shows all variants and usage

4. 🔀 Merge Master Rows
   - POST /api/master-rows/merge
   - Updates master_mapping, reports_l2_extracted, master_rows
   - Transaction-safe (all-or-nothing)

5. 🌐 Web UI
   - http://localhost:8000/master-rows-manager
   - Easy-to-use graphical interface

Next Steps:
===========

1. Open the web UI: http://localhost:8000/master-rows-manager
2. Find master_row_id=65 (if it exists)
3. Search for similar rows
4. Select a target and execute a merge
5. Verify the changes in the database

Documentation:
=============

See MASTER_ROWS_MANAGEMENT_GUIDE.md for complete documentation.

Happy merging! 🎉
""")

print("=" * 80)
