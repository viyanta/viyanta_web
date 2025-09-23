#!/usr/bin/env python3
"""
Debug template matching for different companies
"""

import re
from pathlib import Path


def resolve_company_template_dir(raw_company: str, templates_root: Path) -> Path:
    """Resolve company dir by tolerant matching."""
    lower_name = raw_company.lower().strip()

    print(f"  Looking for: '{lower_name}'")

    # try exact
    direct = templates_root / lower_name
    print(f"  Direct path: {direct} (exists: {direct.exists()})")

    if direct.exists():
        return direct

    # normalize and fuzzy match
    target_norm = re.sub(r"[^a-z0-9]", "", lower_name)
    print(f"  Normalized target: '{target_norm}'")

    candidates = []
    for d in templates_root.iterdir():
        if d.is_dir() and d.name != 'pdf_extractor_demo.html':
            d_norm = re.sub(r"[^a-z0-9]", "", d.name.lower())
            print(f"    Checking '{d.name}' -> '{d_norm}'")

            if target_norm == d_norm:
                print(f"      ✅ EXACT MATCH")
                candidates.append(d)
            elif target_norm.startswith(d_norm):
                print(f"      ✅ STARTS WITH MATCH")
                candidates.append(d)
            elif d_norm.startswith(target_norm):
                print(f"      ✅ ENDS WITH MATCH")
                candidates.append(d)

    if candidates:
        best = sorted(candidates, key=lambda p: len(p.name))[0]
        print(f"  ✅ Best candidate: {best.name}")
        return best

    print(f"  ❌ No candidates found")
    return direct  # non-existing path


def test_company_mapping():
    """Test company name to template directory mapping"""

    templates_root = Path("templates")

    # Test companies that are failing
    failing_companies = [
        "Aditya Birla Sun Life",
        "Canara HSBC Life",
        "GO Digit Life",
        "Shriram Life",
        "ICICI Prudential"
    ]

    print("🔍 TEMPLATE DIRECTORY MAPPING TEST")
    print("=" * 60)

    for company in failing_companies:
        print(f"\n🏢 Testing: {company}")
        template_dir = resolve_company_template_dir(company, templates_root)

        if template_dir.exists():
            templates = list(template_dir.glob("*.json"))
            print(f"  📁 Found directory: {template_dir.name}")
            print(f"  📄 Templates: {len(templates)}")

            # Check for specific forms
            l1_templates = [t for t in templates if 'L-1' in t.name.upper()]
            l10_templates = [t for t in templates if 'L-10' in t.name.upper()]

            print(f"  📋 L-1* forms: {[t.name for t in l1_templates]}")
            print(f"  📋 L-10* forms: {[t.name for t in l10_templates]}")
        else:
            print(f"  ❌ Template directory not found!")

    # Show all available template directories
    print(f"\n📁 ALL AVAILABLE TEMPLATE DIRECTORIES:")
    for d in templates_root.iterdir():
        if d.is_dir() and d.name != 'pdf_extractor_demo.html':
            templates_count = len(list(d.glob("*.json")))
            print(f"  - {d.name} ({templates_count} templates)")


if __name__ == "__main__":
    test_company_mapping()
