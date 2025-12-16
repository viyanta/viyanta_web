"""
Template Resolution Service
Handles dynamic template selection and form code detection
"""
import re
from pathlib import Path
from typing import Dict, List, Optional


class TemplateResolver:
    """Service for resolving templates based on form codes and company names"""

    def __init__(self, templates_root: Path = None):
        self.templates_root = templates_root or Path("templates")

    def extract_form_code_from_filename(self, filename: str) -> Optional[str]:
        """
        Extract form code from filename with priority matching
        Returns: Form code like 'L-1-A', 'L-6A', 'L-10', etc.
        """
        patterns = [
            r'(L-\d+-[A-Z]+)(?:-[A-Z]+)*',  # L-1-A, L-2-A (captures L-X-Y)
            r'(L-\d+[A-Z]+)',                 # L-6A, L-9A (letter suffix)
            r'(L-\d+)',                       # L-10, L-11 (just numbers)
        ]

        filename_upper = filename.upper()

        for pattern in patterns:
            match = re.search(pattern, filename_upper)
            if match:
                form_code = match.group(1).replace('_', '-')
                return form_code

        return None

    def resolve_company_template_dir(self, company_name: str) -> Path:
        """
        Resolve company template directory with fuzzy matching
        """
        lower_name = company_name.lower().strip()

        # Try exact match first
        direct = self.templates_root / lower_name
        if direct.exists():
            return direct

        # Normalize and fuzzy match
        target_norm = re.sub(r"[^a-z0-9]", "", lower_name)
        candidates = []

        for d in self.templates_root.iterdir():
            if d.is_dir():
                d_norm = re.sub(r"[^a-z0-9]", "", d.name.lower())
                if target_norm == d_norm or target_norm.startswith(d_norm) or d_norm.startswith(target_norm):
                    candidates.append(d)

        if candidates:
            return sorted(candidates, key=lambda p: len(p.name))[0]

        return direct  # Return non-existing path if not found

    def build_template_index(self) -> Dict[str, List[Dict[str, str]]]:
        """
        Scan all company template folders and build index by form code
        Returns: {
            'L-6A': [
                {'company': 'hdfc', 'file': 'L-6A SHAREHOLDERS.json', 'path': '/abs/path'},
                ...
            ]
        }
        """
        index: Dict[str, List[Dict[str, str]]] = {}

        if not self.templates_root.exists():
            return index

        for company_dir in self.templates_root.iterdir():
            if not company_dir.is_dir():
                continue

            for template_file in company_dir.glob("*.json"):
                stem = template_file.stem.upper().replace('_', '-')

                # Extract base form code
                patterns = [
                    r'(L-\d+[A-Z]+)',
                    r'(L-\d+-[A-Z]+)',
                    r'(L-\d+)',
                ]

                base = None
                for pattern in patterns:
                    match = re.search(pattern, stem)
                    if match:
                        base = match.group(1)
                        break

                if not base:
                    continue

                entry = {
                    "company": company_dir.name,
                    "file": template_file.name,
                    "path": str(template_file.absolute())
                }

                if base not in index:
                    index[base] = []
                index[base].append(entry)

        return index

    def find_best_template(
        self,
        form_code: str,
        preferred_company: str,
        template_index: Dict[str, List[Dict[str, str]]]
    ) -> Optional[Dict[str, str]]:
        """
        Find best matching template for the given form code and company
        """
        if not form_code:
            return None

        form_code_upper = form_code.upper().replace('_', '-')
        preferred_company_lower = preferred_company.lower()

        # Build candidates with progressive shortening
        candidates = self._build_form_code_candidates(form_code_upper)

        # Search for matches in preferred company only
        for candidate in candidates:
            if candidate in template_index:
                company_entries = [
                    e for e in template_index[candidate]
                    if e['company'].lower() == preferred_company_lower
                ]
                if company_entries:
                    return company_entries[0]

        return None

    def _build_form_code_candidates(self, form_code: str) -> List[str]:
        """Build list of candidate form codes with progressive shortening"""
        candidates = [form_code]
        tokens = form_code.split('-')

        # For forms like L-6A-SHAREHOLDERS, try L-6A before L-6
        if len(tokens) >= 2 and re.match(r'L-\d+[A-Z]', '-'.join(tokens[:2])):
            base_with_letter = '-'.join(tokens[:2])  # L-6A
            if base_with_letter not in candidates:
                candidates.append(base_with_letter)

        # Try just the number part L-6
        if len(tokens) >= 2:
            base_number = '-'.join(tokens[:2])
            if not re.match(r'L-\d+[A-Z]', base_number) and base_number not in candidates:
                candidates.append(base_number)

        # Progressive shortening
        remaining_tokens = tokens[:]
        while len(remaining_tokens) >= 2:
            remaining_tokens = remaining_tokens[:-1]
            candidate = '-'.join(remaining_tokens)
            if candidate not in candidates:
                candidates.append(candidate)

        # Try expanded form patterns for abbreviations
        if len(tokens) >= 3:
            candidates.extend(self._expand_abbreviations(tokens))

        return candidates

    def _expand_abbreviations(self, tokens: List[str]) -> List[str]:
        """Expand common abbreviations in form codes"""
        base_part = '-'.join(tokens[:2])
        abbrev = tokens[2]

        expansions = {
            'C': ['COMMISSION', 'CLAIMS', 'CURRENT', 'CASH'],
            'OP': ['OPERATING', 'OPERATIONS'],
            'EX': ['EXPENSES', 'EXPENDITURE'],
            'INV': ['INVESTMENT', 'INVESTMENTS'],
            'SH': ['SHAREHOLDERS', 'SHARE'],
            'POL': ['POLICYHOLDERS', 'POLICY'],
            'BEN': ['BENEFITS', 'BENEFICIARY'],
            'RES': ['RESERVES', 'REVENUE'],
            'SUP': ['SURPLUS', 'SUPPLEMENTARY'],
            'LIA': ['LIABILITIES', 'LIABILITY'],
            'ASS': ['ASSETS', 'ASSESSMENT']
        }

        expanded = []
        if abbrev in expansions:
            for expansion in expansions[abbrev]:
                expanded.append(f"{base_part}-{expansion}")

        return expanded

    def resolve_template(
        self,
        company_name: str,
        split_filename: str,
        stored_form_code: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Main method to resolve template path for a given company and split file

        Returns:
            {
                'success': bool,
                'template_path': Path,
                'template_name': str,
                'form_code': str,
                'company_dir': Path,
                'error': str (if failed)
            }
        """
        # Extract form code from filename (more reliable than stored metadata)
        form_code = self.extract_form_code_from_filename(split_filename)

        if not form_code:
            form_code = stored_form_code

        if not form_code:
            return {
                'success': False,
                'error': f"Could not extract form code from filename: {split_filename}"
            }

        # Resolve company template directory
        company_dir = self.resolve_company_template_dir(company_name)

        if not company_dir.exists():
            return {
                'success': False,
                'error': f"Company templates directory not found: {company_name}"
            }

        # Build template index
        template_index = self.build_template_index()

        # Find best matching template
        template_entry = self.find_best_template(
            form_code,
            company_dir.name,
            template_index
        )

        if not template_entry:
            available_forms = [
                fc for fc, entries in template_index.items()
                if any(e['company'].lower() == company_dir.name.lower() for e in entries)
            ]

            return {
                'success': False,
                'error': f"No template found for form '{form_code}' in {company_name}",
                'available_forms': available_forms,
                'form_code': form_code
            }

        template_path = Path(template_entry['path'])

        if not template_path.exists():
            return {
                'success': False,
                'error': f"Template file not found: {template_path}"
            }

        return {
            'success': True,
            'template_path': template_path,
            'template_name': template_entry['file'],
            'form_code': form_code,
            'company_dir': company_dir
        }
