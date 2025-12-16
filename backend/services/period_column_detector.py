"""
Period Column Detector
======================
Dynamically identifies period columns from flat_headers based on patterns.

Purpose: Different companies use different column naming conventions:
- HDFC: "Period ended June 30, 2024"
- AXIS: "Upto the Quarter June 30, 2024"
- SBI: "For the current period", "For the previous period"

This module intelligently detects which columns represent:
- for_current_period
- for_previous_period
- upto_current_period
- upto_previous_period

Author: Senior Data Engineer
Date: December 2025
"""

import re
from typing import Dict, List, Optional
from datetime import datetime


class PeriodColumnDetector:
    """Smart detector for period columns in IRDAI L-Forms"""

    # Pattern definitions for period column detection
    PATTERNS = {
        'current': [
            r'current\s+period',
            r'ended?\s+\w+\s+\d+,?\s+\d{4}',  # "ended June 30, 2024"
            r'quarter\s+ended',
            r'period\s+ended',
            r'for\s+the\s+\w+\s+\d+',
            r'q[1-4]\s+\d{4}',  # Q1 2024
            r'fy\s*\d{4}',  # FY2024
        ],
        'previous': [
            r'previous\s+period',
            r'ended?\s+\w+\s+\d+,?\s+\d{4}',  # Will be older date
            r'comparative\s+period',
            r'prior\s+period',
            r'last\s+year',
            r'py\s*\d{4}',  # PY2023
        ],
        'upto_current': [
            r'upto\s+the\s+current',
            r'upto\s+\w+\s+\d+,?\s+\d{4}',
            r'cumulative\s+current',
            r'ytd\s+current',
            r'year\s+to\s+date',
            r'upto\s+the\s+quarter',
        ],
        'upto_previous': [
            r'upto\s+the\s+previous',
            r'cumulative\s+previous',
            r'ytd\s+previous',
            r'upto\s+\w+\s+\d+,?\s+\d{4}',  # Will be older date
        ]
    }

    @classmethod
    def detect_period_columns(
        cls,
        flat_headers: List[str],
        verbose: bool = False
    ) -> Dict[str, Optional[str]]:
        """
        Detect period columns from flat headers

        Args:
            flat_headers: List of column names from the report
            verbose: If True, print detection details

        Returns:
            Dictionary with keys:
            - 'for_current_period': column name or None
            - 'for_previous_period': column name or None
            - 'upto_current_period': column name or None
            - 'upto_previous_period': column name or None
        """
        if not flat_headers:
            return {
                'for_current_period': None,
                'for_previous_period': None,
                'upto_current_period': None,
                'upto_previous_period': None
            }

        # Filter out non-data columns
        data_columns = [
            col for col in flat_headers
            if col not in ['Particulars', 'particulars', 'Schedule', 'schedule',
                           'Schedule_Ref', 'Schedule Ref', 'Form_No', 'Form No',
                           'Description', 'description', 'Row Name', 'row_name']
        ]

        if verbose:
            print(
                f"\n[Period Detector] Analyzing {len(data_columns)} data columns:")
            for col in data_columns:
                print(f"  - {col}")

        # Try pattern-based matching first
        result = cls._pattern_based_detection(data_columns, verbose)

        # If pattern matching didn't find enough, use fallback heuristics
        if not result['for_current_period'] and data_columns:
            result = cls._heuristic_detection(data_columns, verbose)

        if verbose:
            print(f"\n[Period Detector] Detection Result:")
            for key, value in result.items():
                print(f"  {key}: {value}")

        return result

    @classmethod
    def _pattern_based_detection(
        cls,
        columns: List[str],
        verbose: bool
    ) -> Dict[str, Optional[str]]:
        """Pattern-based detection using regex"""
        result = {
            'for_current_period': None,
            'for_previous_period': None,
            'upto_current_period': None,
            'upto_previous_period': None
        }

        # Extract dates from columns for temporal ordering
        column_dates = {}
        for col in columns:
            date = cls._extract_date(col)
            if date:
                column_dates[col] = date

        # Sort columns by date (newest first)
        sorted_by_date = sorted(
            column_dates.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Categorize columns
        current_candidates = []
        previous_candidates = []
        upto_current_candidates = []
        upto_previous_candidates = []

        for col in columns:
            col_lower = col.lower()

            # Check for 'upto' patterns first (more specific)
            if any(re.search(pattern, col_lower) for pattern in cls.PATTERNS['upto_current']):
                upto_current_candidates.append(col)
            elif any(re.search(pattern, col_lower) for pattern in cls.PATTERNS['upto_previous']):
                upto_previous_candidates.append(col)
            # Then check for regular period patterns
            elif any(re.search(pattern, col_lower) for pattern in cls.PATTERNS['current']):
                current_candidates.append(col)
            elif any(re.search(pattern, col_lower) for pattern in cls.PATTERNS['previous']):
                previous_candidates.append(col)

        # Select best candidates (prefer more recent dates for current)
        if current_candidates:
            # Prefer columns with dates, and pick the most recent
            current_with_dates = [
                c for c in current_candidates if c in column_dates]
            if current_with_dates:
                result['for_current_period'] = max(
                    current_with_dates, key=lambda c: column_dates[c])
            else:
                result['for_current_period'] = current_candidates[0]

        if previous_candidates:
            # Prefer columns with dates, and pick the older one
            previous_with_dates = [
                c for c in previous_candidates if c in column_dates]
            if previous_with_dates:
                # Exclude the current period date
                current_date = column_dates.get(result['for_current_period'])
                previous_with_dates = [
                    c for c in previous_with_dates
                    if not current_date or column_dates[c] < current_date
                ]
                if previous_with_dates:
                    result['for_previous_period'] = max(
                        previous_with_dates, key=lambda c: column_dates[c])
            if not result['for_previous_period'] and previous_candidates:
                result['for_previous_period'] = previous_candidates[0]

        # If still no previous period, but we have columns with dates
        # and we identified current period, try to find the older date
        if not result['for_previous_period'] and result['for_current_period']:
            current_date = column_dates.get(result['for_current_period'])
            if current_date and sorted_by_date:
                # Find columns with dates older than current
                older_columns = [
                    col for col, date in sorted_by_date
                    if date < current_date and col != result['for_current_period']
                ]
                if older_columns:
                    # Most recent of the older dates
                    result['for_previous_period'] = older_columns[0]

        if upto_current_candidates:
            result['upto_current_period'] = upto_current_candidates[0]

        if upto_previous_candidates:
            result['upto_previous_period'] = upto_previous_candidates[0]

        return result

    @classmethod
    def _heuristic_detection(
        cls,
        columns: List[str],
        verbose: bool
    ) -> Dict[str, Optional[str]]:
        """
        Fallback heuristic detection when patterns don't match

        Strategy:
        1. First separate "upto/cumulative" columns from "for" columns
        2. Sort columns by date (newest first)
        3. Assign to appropriate categories
        """
        result = {
            'for_current_period': None,
            'for_previous_period': None,
            'upto_current_period': None,
            'upto_previous_period': None
        }

        if verbose:
            print(f"\n[Period Detector] Using heuristic detection...")

        if len(columns) == 0:
            return result

        # Separate columns into "upto/cumulative" and "for/regular" categories
        upto_columns = []
        for_columns = []
        
        for col in columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['upto', 'cumulative', 'ytd', 'year to date', 'year-to-date']):
                upto_columns.append(col)
            else:
                for_columns.append(col)
        
        # Sort each category by date (newest first)
        upto_sorted = sorted(upto_columns, key=lambda x: cls._extract_date(x) or datetime(1900, 1, 1), reverse=True)
        for_sorted = sorted(for_columns, key=lambda x: cls._extract_date(x) or datetime(1900, 1, 1), reverse=True)

        # Assign upto columns
        if len(upto_sorted) >= 1:
            result['upto_current_period'] = upto_sorted[0]
        if len(upto_sorted) >= 2:
            result['upto_previous_period'] = upto_sorted[1]

        # Assign for columns
        if len(for_sorted) >= 1:
            result['for_current_period'] = for_sorted[0]
        if len(for_sorted) >= 2:
            result['for_previous_period'] = for_sorted[1]

        return result

    @classmethod
    def _extract_date(cls, text: str) -> Optional[datetime]:
        """Extract date from column name (e.g., 'June 30, 2024')"""
        # Common patterns
        patterns = [
            r'(\w+)\s+(\d{1,2}),?\s+(\d{4})',  # "June 30, 2024"
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',  # "06/30/2024"
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',  # "2024-06-30"
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    groups = match.groups()

                    # Handle different formats
                    if len(groups) == 3:
                        # Try parsing month name
                        if groups[0].isalpha():
                            # "June 30, 2024"
                            month_str = groups[0]
                            day = int(groups[1])
                            year = int(groups[2])

                            month_map = {
                                'january': 1, 'jan': 1,
                                'february': 2, 'feb': 2,
                                'march': 3, 'mar': 3,
                                'april': 4, 'apr': 4,
                                'may': 5,
                                'june': 6, 'jun': 6,
                                'july': 7, 'jul': 7,
                                'august': 8, 'aug': 8,
                                'september': 9, 'sep': 9, 'sept': 9,
                                'october': 10, 'oct': 10,
                                'november': 11, 'nov': 11,
                                'december': 12, 'dec': 12,
                            }

                            month = month_map.get(month_str.lower())
                            if month:
                                return datetime(year, month, day)
                        else:
                            # Numeric date
                            return datetime(int(groups[2]), int(groups[0]), int(groups[1]))

                except (ValueError, KeyError):
                    continue

        return None


# =================================================================
# EXAMPLE USAGE
# =================================================================

if __name__ == "__main__":
    # Test with different header formats

    print("="*80)
    print("TEST 1: HDFC-style headers")
    print("="*80)
    hdfc_headers = [
        "Particulars",
        "Schedule",
        "Period ended June 30, 2024",
        "Period ended June 30, 2023"
    ]
    result1 = PeriodColumnDetector.detect_period_columns(
        hdfc_headers, verbose=True)

    print("\n" + "="*80)
    print("TEST 2: AXIS-style headers")
    print("="*80)
    axis_headers = [
        "Particulars",
        "Schedule",
        "Upto the Quarter June 30, 2024",
        "Upto the Quarter June 30, 2023",
        "For the Quarter June 30, 2024",
        "For the Quarter June 30, 2023"
    ]
    result2 = PeriodColumnDetector.detect_period_columns(
        axis_headers, verbose=True)

    print("\n" + "="*80)
    print("TEST 3: Generic headers")
    print("="*80)
    generic_headers = [
        "Particulars",
        "Schedule",
        "For the current period",
        "For the previous period",
        "Upto the current period",
        "Upto the previous period"
    ]
    result3 = PeriodColumnDetector.detect_period_columns(
        generic_headers, verbose=True)

    print("\n" + "="*80)
    print("TEST 4: Fallback heuristic (no clear patterns)")
    print("="*80)
    fallback_headers = [
        "Particulars",
        "Schedule",
        "Column_A",
        "Column_B",
        "Column_C",
        "Column_D"
    ]
    result4 = PeriodColumnDetector.detect_period_columns(
        fallback_headers, verbose=True)
