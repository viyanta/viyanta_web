"""
Master Row Mapping Pipeline for IRDAI L-Forms
==============================================

This pipeline automatically creates and maintains master row mappings using:
- NLP text normalization
- TF-IDF vectorization
- ML clustering (Agglomerative Clustering)
- Fuzzy matching (RapidFuzz)

Purpose: Map similar row names across different companies to canonical master rows
Example: "(b) Profit on sale of investments" and "Gain from sale of investments" 
         should map to the same master_row_id

Author: Senior Data Engineer
Date: December 2025
"""

from tqdm import tqdm
from rapidfuzz import fuzz, process
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pymysql
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
import re
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Database

# NLP and ML

# Progress tracking

# ============================================================================
# CONFIGURATION
# ============================================================================


class Config:
    """Configuration for the master mapping pipeline"""

    # Database connection
    DB_HOST = "localhost"
    DB_PORT = 3306
    DB_USER = "root"
    DB_PASSWORD = ""  # TODO: Update with actual password
    DB_NAME = "viyanta_web"

    # L-form to process (can be parameterized)
    FORM_NO = "L-2-A"  # Change as needed

    # NLP Settings
    STOPWORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'shall'
    }

    # Clustering Settings
    CLUSTERING_METHOD = "agglomerative"  # or "dbscan"
    SIMILARITY_THRESHOLD = 0.75  # For Agglomerative clustering
    MIN_SIMILARITY_SCORE = 0.60  # Minimum fuzzy match score to accept

    # Agglomerative Clustering params
    AGGLOM_DISTANCE_THRESHOLD = 0.5  # Lower = tighter clusters
    AGGLOM_LINKAGE = "average"  # 'ward', 'complete', 'average', 'single'

    # DBSCAN params (alternative)
    DBSCAN_EPS = 0.3
    DBSCAN_MIN_SAMPLES = 2


# ============================================================================
# TEXT NORMALIZATION
# ============================================================================

class TextNormalizer:
    """Handles NLP-based text normalization for row names"""

    @staticmethod
    def normalize(text: str, stopwords: set = Config.STOPWORDS) -> str:
        """
        Normalize text using ENHANCED NLP techniques for financial line items

        Improvements:
        - Treat 'year' and 'period' as synonyms
        - Remove temporal modifiers: 'during the period/year'
        - Remove optional details: 'to be specified'
        - More aggressive plural/singular normalization
        - Better handling of punctuation variations

        Steps:
        1. Lowercase
        2. Remove numbering: (a), (b), (i), (ii), 1., 2., etc.
        3. Remove optional temporal/detail phrases
        4. Normalize synonyms (year=period)
        5. Remove punctuation (except spaces)
        6. Remove stopwords
        7. Enhanced stemming (remove common suffixes)
        8. Remove extra whitespace

        Args:
            text: Original text
            stopwords: Set of words to remove

        Returns:
            Normalized text
        """
        if not text or pd.isna(text):
            return ""

        # Lowercase
        text = text.lower().strip()

        # FIX: Preserve UPPERCASE context letters (A), (B), (C) ONLY when they appear
        # AFTER words like "total", "subtotal", etc. (not as list markers at start)
        # These are important semantic distinctions that should NOT be clustered together
        # Example: "total (a)" -> "total suffix_a", but "(a) interest" -> "interest"

        # First, protect uppercase context markers that come AFTER words
        # Look for word + space + (A), (B), (C)
        text = re.sub(
            r'(\w+)\s*\(([a-z])\)', lambda m: m.group(1) + '' + m.group(2), text)

        # Remove lowercase sub-item markers at START of line (list numbering)
        # Remove (a), (b), (c) at start only
        text = re.sub(r'^\s*\([a-z]\)\s*', '', text)

        # Remove other numbering patterns: (i), (ii), 1., 2., etc.
        text = re.sub(r'\([ivxlcdm]{1,4}\)', '', text)  # (i), (ii), (iii)
        text = re.sub(r'^\s*\d+\.\s*', '', text)  # Remove 1., 2., 3. at start
        text = re.sub(r'[ivxlcdm]+\.', '', text)  # i., ii., iii.

        # ENHANCEMENT 1: Remove temporal modifiers (optional time references)
        text = re.sub(r'\bduring\s+the\s+(period|year)\b', '', text)
        text = re.sub(
            r'\bat\s+the\s+end\s+of\s+the\s+(period|year)\b', '', text)
        text = re.sub(
            r'\bat\s+the\s+beginning\s+of\s+the\s+(period|year)\b', 'at beginning', text)

        # ENHANCEMENT 2: Remove optional detail phrases
        text = re.sub(r'\(?\s*to\s+be\s+specified\s*\)?', '', text)
        text = re.sub(r'\(?\s*if\s+any\s*\)?', '', text)
        text = re.sub(r'\(?\s*net\s*\)?', '', text,
                      flags=re.IGNORECASE)  # (Net), (net)

        # ENHANCEMENT 3: Normalize synonyms
        # year <-> period (treat as equivalent temporal references)
        text = re.sub(r'\byear\b', 'period', text)

        # ENHANCEMENT 4: Normalize common accounting term variations
        text = re.sub(r'\bprofit\s*/?\s*\(?\s*loss\s*\)?', 'profit loss', text)
        text = re.sub(r'\bgain\b', 'profit', text)
        text = re.sub(r'\bsale\s*/?\s*redemption', 'sale redemption', text)

        # Remove special characters but keep spaces, hyphens, and underscores
        text = re.sub(r'[^\w\s\-]', ' ', text)

        # Tokenize
        tokens = text.split()

        # Remove stopwords (but keep our suffix markers!)
        tokens = [t for t in tokens if (t.startswith('suffix_') or (
            t not in stopwords and len(t) > 2))]

        # ENHANCEMENT 5: More aggressive stemming for accounting terms
        stemmed = []
        for token in tokens:
            # Don't stem our special suffix markers
            if token.startswith('suffix_'):
                stemmed.append(token)
                continue

            # Remove common suffixes more aggressively
            # Remove plural 's' (but not for words ending in 'ss')
            if token.endswith('s') and len(token) > 3 and not token.endswith('ss'):
                token = token[:-1]
            # Remove 'ing'
            if token.endswith('ing') and len(token) > 5:
                token = token[:-3]
            # Remove 'ed'
            if token.endswith('ed') and len(token) > 4:
                token = token[:-2]
            # Remove 'es' (for indices -> indic, expenses -> expens)
            if token.endswith('es') and len(token) > 4:
                token = token[:-2]

            stemmed.append(token)

        # Join and clean
        normalized = ' '.join(stemmed)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    @staticmethod
    def batch_normalize(texts: pd.Series) -> pd.Series:
        """Normalize a pandas Series of texts"""
        return texts.apply(TextNormalizer.normalize)


# ============================================================================
# CLUSTERING ENGINE
# ============================================================================

class RowClusterer:
    """Handles ML-based clustering of normalized row names"""

    def __init__(self, method: str = "agglomerative"):
        self.method = method
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 3),  # Unigrams, bigrams, trigrams
            min_df=1,
            max_df=0.95
        )

    def fit_predict(self, normalized_texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Cluster normalized texts using TF-IDF + ML clustering

        Args:
            normalized_texts: List of normalized text strings

        Returns:
            Tuple of (cluster_labels, similarity_matrix)
        """
        if len(normalized_texts) == 0:
            return np.array([]), np.array([])

        # Handle single text case
        if len(normalized_texts) == 1:
            return np.array([0]), np.array([[1.0]])

        print(f"  🔧 Vectorizing {len(normalized_texts)} texts...")

        # TF-IDF vectorization
        tfidf_matrix = self.vectorizer.fit_transform(normalized_texts)

        # Compute cosine similarity
        similarity_matrix = cosine_similarity(tfidf_matrix)

        # Convert similarity to distance (for clustering)
        distance_matrix = 1 - similarity_matrix

        print(f"  🤖 Clustering using {self.method}...")

        # Clustering
        if self.method == "agglomerative":
            clusterer = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=Config.AGGLOM_DISTANCE_THRESHOLD,
                linkage=Config.AGGLOM_LINKAGE,
                metric='precomputed'
            )
            labels = clusterer.fit_predict(distance_matrix)

        elif self.method == "dbscan":
            clusterer = DBSCAN(
                eps=Config.DBSCAN_EPS,
                min_samples=Config.DBSCAN_MIN_SAMPLES,
                metric='precomputed'
            )
            labels = clusterer.fit_predict(distance_matrix)

            # Handle noise points (label = -1) by assigning unique clusters
            noise_mask = labels == -1
            if noise_mask.any():
                max_label = labels.max()
                labels[noise_mask] = np.arange(
                    max_label + 1, max_label + 1 + noise_mask.sum())

        else:
            raise ValueError(f"Unknown clustering method: {self.method}")

        n_clusters = len(np.unique(labels))
        print(f"  ✅ Found {n_clusters} clusters")

        return labels, similarity_matrix

    def get_cluster_representative(
        self,
        cluster_texts: List[str],
        cluster_normalized: List[str],
        similarity_matrix: np.ndarray
    ) -> Tuple[str, str]:
        """
        Choose the most representative text from a cluster

        Strategy: 
        1. Pick texts with high average similarity (top 50%)
        2. Among those, prefer LONGER, more complete descriptions
        3. This ensures we get full row names like "Amounts transferred from..." 
           instead of abbreviated "Amount Transferred to..."

        Args:
            cluster_texts: Original texts in cluster
            cluster_normalized: Normalized texts in cluster
            similarity_matrix: Similarity matrix for this cluster

        Returns:
            Tuple of (representative_original, representative_normalized)
        """
        if len(cluster_texts) == 1:
            return cluster_texts[0], cluster_normalized[0]

        # Step 1: Compute average similarity for each text
        avg_similarities = similarity_matrix.mean(axis=1)

        # Step 2: Get top 50% most similar texts (or at least top 3)
        n_candidates = max(3, len(cluster_texts) // 2)
        top_indices = np.argsort(avg_similarities)[-n_candidates:]

        # Step 3: Among candidates, pick the LONGEST text
        # Longer text = more complete description = better master name
        best_idx = max(top_indices, key=lambda i: len(cluster_texts[i]))

        return cluster_texts[best_idx], cluster_normalized[best_idx]


# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

class DatabaseManager:
    """Handles all database operations"""

    def __init__(self):
        """Initialize database connection using existing database config"""
        # Import the existing database configuration
        from databases.database import engine as db_engine
        self.engine = db_engine
        self.Session = sessionmaker(bind=self.engine)

    def get_existing_masters(self, form_no: Optional[str] = None) -> pd.DataFrame:
        """
        Fetch all existing master rows with their normalized texts

        Args:
            form_no: Optional form number to filter (e.g., 'L-2')

        Returns:
            DataFrame with columns: master_row_id, cluster_label, master_name, normalized_text
        """
        if form_no:
            # Get masters only for this form
            # CRITICAL FIX: Use GROUP BY to ensure each normalized_text appears only once
            # Pick the LOWEST cluster_label for each normalized_text (first created)
            query = text("""
                SELECT 
                    MIN(mr.master_row_id) as master_row_id,
                    MIN(mr.cluster_label) as cluster_label,
                    MIN(mr.master_name) as master_name,
                    mm.normalized_text
                FROM master_rows mr
                LEFT JOIN master_mapping mm ON mr.cluster_label = mm.cluster_label
                WHERE mm.form_no = :form_no
                    AND mm.normalized_text IS NOT NULL
                GROUP BY mm.normalized_text
                ORDER BY MIN(mr.cluster_label)
            """)
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn, params={"form_no": form_no})
        else:
            # Get all masters
            # CRITICAL FIX: Use GROUP BY to ensure each normalized_text appears only once
            query = text("""
                SELECT 
                    MIN(mr.master_row_id) as master_row_id,
                    MIN(mr.cluster_label) as cluster_label,
                    MIN(mr.master_name) as master_name,
                    mm.normalized_text
                FROM master_rows mr
                LEFT JOIN master_mapping mm ON mr.cluster_label = mm.cluster_label
                WHERE mm.normalized_text IS NOT NULL
                GROUP BY mm.normalized_text
                ORDER BY MIN(mr.cluster_label)
            """)
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn)

        print(f"  📚 Loaded {len(df)} unique existing master rows")
        return df

    def get_extracted_rows(self, form_no: str) -> pd.DataFrame:
        """
        Fetch all distinct rows from reports_l2_extracted for a form

        Args:
            form_no: L-form number (e.g., 'L-2-A')

        Returns:
            DataFrame with columns: id, report_id, company_id, particulars, normalized_text, row_index
        """
        query = text("""
            SELECT DISTINCT
                e.id,
                e.report_id,
                e.company_id,
                e.particulars,
                e.normalized_text,
                e.master_row_id,
                e.row_index,
                r.form_no
            FROM reports_l2_extracted e
            JOIN reports_l2 r ON e.report_id = r.id
            WHERE r.form_no = :form_no
                AND e.particulars IS NOT NULL
                AND e.particulars != ''
            ORDER BY e.company_id, e.row_index
        """)

        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"form_no": form_no})

        print(f"  📊 Loaded {len(df)} rows for form {form_no}")
        return df

    def fetch_extracted_rows_by_reports(
        self,
        table_key: str,
        company_id: int,
        report_ids: List[int]
    ) -> pd.DataFrame:
        """
        Fetch rows from reports_l*_extracted for specific reports

        Args:
            table_key: Normalized table key (e.g., 'l2', 'l6a')
            company_id: Company ID
            report_ids: List of report IDs to fetch

        Returns:
            DataFrame with columns: id, report_id, company_id, particulars, normalized_text, row_index
        """
        if not report_ids:
            return pd.DataFrame()

        # Build table name
        extracted_table = f"reports_{table_key}_extracted"

        # Build placeholders for IN clause
        placeholders = ','.join([f':id{i}' for i in range(len(report_ids))])

        query = text(f"""
            SELECT 
                id,
                report_id,
                company_id,
                particulars,
                normalized_text,
                master_row_id,
                row_index
            FROM {extracted_table}
            WHERE company_id = :company_id
                AND report_id IN ({placeholders})
                AND particulars IS NOT NULL
                AND particulars != ''
            ORDER BY report_id, row_index
        """)

        # Build params dict
        params = {'company_id': company_id}
        for i, rid in enumerate(report_ids):
            params[f'id{i}'] = rid

        try:
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn, params=params)

            print(f"  📊 Loaded {len(df)} rows from {extracted_table}")
            return df
        except Exception as e:
            print(f"  ❌ Error fetching rows from {extracted_table}: {e}")
            return pd.DataFrame()

    def update_normalized_text(self, updates: List[Tuple[int, str]]):
        """
        Batch update normalized_text in reports_l2_extracted

        Args:
            updates: List of (id, normalized_text) tuples
        """
        if not updates:
            return

        query = text("""
            UPDATE reports_l2_extracted
            SET normalized_text = :normalized_text
            WHERE id = :id
        """)

        with self.engine.begin() as conn:
            for row_id, normalized in tqdm(updates, desc="  💾 Updating normalized_text"):
                conn.execute(
                    query, {"id": row_id, "normalized_text": normalized})

        print(f"  ✅ Updated {len(updates)} normalized_text values")

    def upsert_master_mapping(self, mappings: List[Dict]):
        """
        Insert or update master_mapping table

        Args:
            mappings: List of dicts with keys: master_name, company_id, form_no,
                     variant_text, normalized_text, cluster_label, similarity_score
        """
        if not mappings:
            return

        query = text("""
            INSERT INTO master_mapping (
                master_name, company_id, form_no, variant_text,
                normalized_text, cluster_label, similarity_score
            ) VALUES (
                :master_name, :company_id, :form_no, :variant_text,
                :normalized_text, :cluster_label, :similarity_score
            )
            ON DUPLICATE KEY UPDATE
                master_name = VALUES(master_name),
                normalized_text = VALUES(normalized_text),
                cluster_label = VALUES(cluster_label),
                similarity_score = VALUES(similarity_score),
                updated_at = CURRENT_TIMESTAMP
        """)

        with self.engine.begin() as conn:
            for mapping in tqdm(mappings, desc="  💾 Upserting master_mapping"):
                conn.execute(query, mapping)

        print(f"  ✅ Upserted {len(mappings)} master mapping entries")

    def get_cluster_master_row_ids(self, form_no: str) -> Dict[int, int]:
        """
        Get master_row_id from master_rows table for each cluster

        CRITICAL: This method now returns master_rows.master_row_id (NOT master_mapping.id)
        This ensures reports_l2_extracted.master_row_id references the canonical source

        Returns:
            Dict mapping cluster_label -> master_rows.master_row_id
        """
        query = text("""
            SELECT cluster_label, master_row_id
            FROM master_rows
            WHERE cluster_label IS NOT NULL
            ORDER BY cluster_label
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query)
            return {row[0]: row[1] for row in result}

    def update_master_row_ids(self, updates: List[Tuple[int, int]]):
        """
        Batch update master_row_id in reports_l2_extracted

        Args:
            updates: List of (id, master_row_id) tuples
        """
        if not updates:
            return

        query = text("""
            UPDATE reports_l2_extracted
            SET master_row_id = :master_row_id
            WHERE id = :id
        """)

        with self.engine.begin() as conn:
            for row_id, master_row_id in tqdm(updates, desc="  💾 Updating master_row_ids"):
                conn.execute(
                    query, {"id": row_id, "master_row_id": master_row_id})

        print(f"  ✅ Updated {len(updates)} master_row_id values")


# ============================================================================
# MAIN PIPELINE
# ============================================================================

class MasterMappingPipeline:
    """Main pipeline orchestrator"""

    def __init__(self):
        self.db = DatabaseManager()
        self.normalizer = TextNormalizer()
        self.clusterer = RowClusterer(method=Config.CLUSTERING_METHOD)

    def run(self, form_no: str = Config.FORM_NO):
        """
        Execute the complete master mapping pipeline

        Steps:
        1. Load extracted rows
        2. Normalize text
        3. Cluster rows
        4. Create master mappings
        5. Update master_row_ids

        Args:
            form_no: L-form number to process
        """
        print("\n" + "=" * 70)
        print(f"🚀 MASTER ROW MAPPING PIPELINE - {form_no}")
        print("=" * 70)

        # Step 1: Load data
        print("\n📥 Step 1: Loading extracted rows...")
        df = self.db.get_extracted_rows(form_no)

        if df.empty:
            print("  ⚠️  No rows found. Exiting.")
            return

        # Step 2: Normalize text
        print("\n🔤 Step 2: Normalizing text...")
        df['normalized_new'] = self.normalizer.batch_normalize(
            df['particulars'])

        # Update normalized_text in database if changed
        updates_normalized = [
            (row['id'], row['normalized_new'])
            for _, row in df.iterrows()
            if row['normalized_new'] != row.get('normalized_text', '')
        ]

        if updates_normalized:
            self.db.update_normalized_text(updates_normalized)
            df['normalized_text'] = df['normalized_new']

        # Step 3: Assign clusters based on SEQUENCE (row_index)
        print("\n🗂️  Step 3: Assigning clusters based on sequence...")

        # FIX: Use SEQUENTIAL clustering (0, 1, 2, 3...) instead of row_index
        # This ensures each unique text gets its own sequential cluster number
        # and prevents conflicts when processing multiple companies
        print(f"\n  📊 Processing ALL companies together...")
        print(f"     Companies found: {df['company_id'].nunique()}")
        print(f"     Total rows: {len(df)}")

        # Build list of unique texts in ORDER of first appearance
        unique_texts_ordered = []
        for _, row in df.sort_values(['company_id', 'row_index']).iterrows():
            normalized_txt = row['normalized_text']
            if normalized_txt not in unique_texts_ordered:
                unique_texts_ordered.append(normalized_txt)

        # Assign SEQUENTIAL cluster numbers (0, 1, 2, 3...) to each unique text
        text_to_cluster = {text: idx for idx,
                           text in enumerate(unique_texts_ordered)}
        df['cluster_label'] = df['normalized_text'].map(text_to_cluster)

        print(f"     Unique texts: {len(unique_texts_ordered)}")
        print(f"     Cluster range: 0 to {df['cluster_label'].max()}")
        print(f"     ✅ Clusters assigned sequentially based on first appearance order")

        # Step 4: Create master mappings
        print(f"\n  📝 Creating master mappings...")
        all_mappings = []

        # For each cluster (which is now based on row order), pick ONE master name
        # Sort clusters by number to maintain order
        unique_clusters = sorted(df['cluster_label'].unique())

        print(f"     Total clusters: {len(unique_clusters)}")

        for cluster_id in unique_clusters:
            # Get ALL rows in this cluster (from all companies)
            cluster_mask = df['cluster_label'] == cluster_id
            cluster_rows = df[cluster_mask]

            # Pick the LONGEST, most complete text as the master name
            # This ensures we get full descriptions, not abbreviated ones
            cluster_texts = cluster_rows['particulars'].tolist()

            # Choose master: longest text (most complete description)
            master_text = max(cluster_texts, key=len)

            print(
                f"       Cluster {cluster_id:3d}: {len(cluster_rows)} variant(s) → master: '{master_text[:60]}...'")

            # Apply this SAME master_text to ALL rows in the cluster
            for _, row in cluster_rows.iterrows():
                # Compute similarity (100% if exact match, fuzzy if variant)
                from rapidfuzz import fuzz
                similarity_score = fuzz.ratio(
                    row['particulars'],
                    master_text
                ) / 100.0  # Convert to 0-1 scale

                all_mappings.append({
                    'master_name': master_text,  # SAME master_name for all in cluster
                    'company_id': int(row['company_id']),
                    'form_no': form_no,
                    'variant_text': row['particulars'],
                    'normalized_text': row['normalized_text'],
                    'cluster_label': int(cluster_id),
                    'similarity_score': float(similarity_score)
                })

        # Step 5: Upsert master mappings
        print("\n💾 Step 4: Upserting master mappings...")
        self.db.upsert_master_mapping(all_mappings)

        # Step 5.5: CRITICAL - Sync master_rows table to ensure canonical master_row_ids exist
        print("\n🔄 Step 4.5: Syncing master_rows table (canonical source)...")
        from services.master_rows_sync_service import MasterRowsSyncService

        sync_service = MasterRowsSyncService()
        sync_result = sync_service.sync_master_rows(
            form_no=form_no,
            verbose=True
        )

        if not sync_result['success']:
            print(f"❌ Failed to sync master_rows: {sync_result.get('error')}")
            return

        print(f"✅ Master rows synced: {sync_result['rows_synced']} rows")

        # Step 6: Update master_row_ids in reports_l2_extracted
        # CRITICAL: Now using master_rows.master_row_id (NOT master_mapping.id)
        print("\n🔗 Step 5: Updating master_row_ids in reports_l2_extracted...")
        cluster_to_master_id = self.db.get_cluster_master_row_ids(form_no)

        # Map each extracted row to its master_row_id
        updates_master_ids = []
        for _, row in df.iterrows():
            # Find cluster for this row
            matching_mapping = next(
                (m for m in all_mappings
                 if m['variant_text'] == row['particulars']
                 and m['company_id'] == row['company_id']),
                None
            )

            if matching_mapping:
                cluster_label = matching_mapping['cluster_label']
                master_row_id = cluster_to_master_id.get(cluster_label)

                if master_row_id:
                    updates_master_ids.append((row['id'], master_row_id))

        self.db.update_master_row_ids(updates_master_ids)

        # Summary
        print("\n" + "=" * 70)
        print("✅ PIPELINE COMPLETE")
        print("=" * 70)
        print(f"  📊 Total rows processed: {len(df)}")
        print(f"  🏷️  Total clusters created: {len(cluster_to_master_id)}")
        print(f"  💾 Master mappings: {len(all_mappings)}")
        print(f"  🔗 Master row IDs updated: {len(updates_master_ids)}")
        print("=" * 70 + "\n")

    def run_targeted_mapping(
        self,
        company_id: int,
        report_ids: List[int],
        form_code: str
    ) -> Dict:
        """
        Run master mapping for specific reports only (lightweight version for real-time use)

        This is called automatically after extraction to create mappings for newly inserted data.

        Args:
            company_id: ID of the company
            report_ids: List of report IDs to process
            form_code: L-form code (e.g., 'L-2-A')

        Returns:
            {
                'success': bool,
                'master_rows_created': int,
                'rows_mapped': int,
                'error': str (if failed)
            }
        """
        try:
            print(f"\n🎯 Running targeted master mapping...")
            print(f"   Company ID: {company_id}")
            print(f"   Report IDs: {report_ids}")
            print(f"   Form Code: {form_code}")

            # Normalize form code to match database tables
            from services.database_storage_service import DatabaseStorageService
            storage_service = DatabaseStorageService()
            table_key = storage_service._normalize_lform_key(form_code)

            if not table_key:
                return {
                    'success': False,
                    'error': f'Could not normalize form code: {form_code}'
                }

            print(f"   Table key: {table_key}")

            # Step 1: Fetch rows from reports_l*_extracted for these specific reports
            df = self.db.fetch_extracted_rows_by_reports(
                table_key=table_key,
                company_id=company_id,
                report_ids=report_ids
            )

            if df.empty:
                print(f"⚠️ No rows found for reports: {report_ids}")
                return {
                    'success': True,
                    'master_rows_created': 0,
                    'rows_mapped': 0,
                    'message': 'No rows to process'
                }

            print(f"   Found {len(df)} rows to process")

            # Step 2: Normalize text
            print(f"   Normalizing text...")
            df['normalized_new'] = df['particulars'].apply(
                self.normalizer.normalize)

            # Update normalized_text in database
            updates_normalized = [
                (row['id'], row['normalized_new'])
                for _, row in df.iterrows()
            ]

            if updates_normalized:
                self.db.update_normalized_text(updates_normalized)
                df['normalized_text'] = df['normalized_new']

            # Step 3: Assign clusters - REUSE existing masters if similar, CREATE new if different
            # This prevents duplicate masters for same financial line items across PDFs/companies
            print(f"   Assigning clusters (with intelligent reuse)...")

            if len(df) == 0:
                return {
                    'success': True,
                    'master_rows_created': 0,
                    'rows_mapped': 0,
                    'message': 'No rows to process'
                }

            # Get existing masters for comparison
            existing_masters_df = self.db.get_existing_masters(form_code)

            # CRITICAL FIX: Get the MAXIMUM existing cluster_label from master_rows
            # so new clusters start AFTER existing ones
            max_existing_cluster_query = text("""
                SELECT COALESCE(MAX(cluster_label), -1) as max_cluster
                FROM master_rows
            """)

            with self.db.engine.connect() as conn:
                result = conn.execute(max_existing_cluster_query)
                max_existing_cluster = result.scalar()

            # Prepare similarity matching using rapidfuzz
            from rapidfuzz import fuzz

            # Assign cluster_label for each row
            text_to_cluster = {}
            next_cluster_id = max_existing_cluster + 1
            reused_count = 0
            new_count = 0

            # Build list of unique texts to process
            unique_texts_ordered = []
            for _, row in df.sort_values('row_index').iterrows():
                normalized_txt = row['normalized_text']
                if normalized_txt not in unique_texts_ordered:
                    unique_texts_ordered.append(normalized_txt)

            print(f"     Unique texts to process: {len(unique_texts_ordered)}")
            print(f"     Existing masters: {len(existing_masters_df)}")
            print(f"     Existing max cluster: {max_existing_cluster}")

            # For each unique text, find best matching existing master or create new
            for unique_text in unique_texts_ordered:
                best_match_cluster = None
                best_similarity = 0.0

                # CRITICAL FIX: First check for EXACT match (100% identical normalized_text)
                # This prevents creating duplicate clusters for identical text
                if not existing_masters_df.empty:
                    exact_match = existing_masters_df[existing_masters_df['normalized_text'] == unique_text]
                    if not exact_match.empty:
                        # Found EXACT match - MUST reuse this cluster
                        best_match_cluster = exact_match.iloc[0]['cluster_label']
                        best_similarity = 1.0
                        text_to_cluster[unique_text] = best_match_cluster
                        reused_count += 1
                        continue  # Skip fuzzy matching

                # No exact match found, try fuzzy matching
                if not existing_masters_df.empty:
                    for _, existing in existing_masters_df.iterrows():
                        existing_normalized = existing.get(
                            'normalized_text', '')
                        if not existing_normalized:
                            continue

                        # Calculate similarity between normalized texts
                        similarity = fuzz.ratio(
                            unique_text, existing_normalized) / 100.0

                        if similarity > best_similarity:
                            best_similarity = similarity
                            best_match_cluster = existing['cluster_label']

                # Decision: REUSE if similarity >= 85%, CREATE NEW if < 85%
                SIMILARITY_THRESHOLD = 0.85

                if best_similarity >= SIMILARITY_THRESHOLD:
                    # REUSE existing cluster
                    text_to_cluster[unique_text] = best_match_cluster
                    reused_count += 1
                else:
                    # CREATE NEW cluster
                    text_to_cluster[unique_text] = next_cluster_id
                    next_cluster_id += 1
                    new_count += 1

            # Map clusters to all rows
            df['cluster_label'] = df['normalized_text'].map(text_to_cluster)

            print(f"     ✅ Reused {reused_count} existing clusters")
            print(f"     ✅ Created {new_count} new clusters")
            if new_count > 0:
                print(
                    f"     New cluster range: {max_existing_cluster + 1} to {next_cluster_id - 1}")

            # Step 4: Create master mappings
            print(f"   Creating master mappings...")
            all_mappings = []
            cluster_to_master_id = {}

            # IMPORTANT FIX: Check if clusters already have master_names from previous runs
            # Query existing master_names for this form to maintain consistency
            existing_masters_query = text("""
                SELECT DISTINCT cluster_label, master_name
                FROM master_mapping
                WHERE form_no = :form_no
                GROUP BY cluster_label, master_name
            """)

            with self.db.engine.connect() as conn:
                result = conn.execute(
                    existing_masters_query, {'form_no': form_code})
                existing_cluster_masters = {
                    # cluster_label -> master_name
                    row[0]: row[1] for row in result}

            print(
                f"   Found {len(existing_cluster_masters)} existing clusters with master names")

            # For each cluster (which is now based on row order), pick ONE master name
            # Sort clusters by number to maintain order
            unique_clusters = sorted(df['cluster_label'].unique())
            print(f"   Total clusters: {len(unique_clusters)}")

            for cluster_id in unique_clusters:
                cluster_mask = df['cluster_label'] == cluster_id
                cluster_rows = df[cluster_mask]

                cluster_texts = cluster_rows['particulars'].tolist()

                # FIX: Check if this cluster already has a master_name
                if cluster_id in existing_cluster_masters:
                    # Use existing master_name to maintain consistency
                    master_text = existing_cluster_masters[cluster_id]
                    print(
                        f"     Cluster {cluster_id}: Using existing master: '{master_text[:50]}...'")
                else:
                    # Create new master_name: pick the LONGEST text (most complete description)
                    master_text = max(cluster_texts, key=len)
                    print(
                        f"     Cluster {cluster_id}: Creating new master: '{master_text[:50]}...'")

                # Apply this SAME master_text to ALL rows in the cluster
                for _, row in cluster_rows.iterrows():
                    # Compute similarity (100% if exact match, fuzzy if variant)
                    from rapidfuzz import fuzz
                    similarity_score = fuzz.ratio(
                        row['particulars'],
                        master_text
                    ) / 100.0  # Convert to 0-1 scale

                    all_mappings.append({
                        'master_name': master_text,  # SAME master_name for all in cluster
                        'company_id': int(company_id),
                        'form_no': form_code,
                        'variant_text': row['particulars'],
                        'normalized_text': row['normalized_text'],
                        'cluster_label': int(cluster_id),
                        'similarity_score': similarity_score
                    })

            # Step 5: Upsert master mappings
            print(f"   Upserting {len(all_mappings)} mappings...")
            self.db.upsert_master_mapping(all_mappings)

            # Step 5.5: CRITICAL - Sync master_rows table to ensure canonical master_row_ids exist
            print(f"   Syncing master_rows table (canonical source)...")
            from services.master_rows_sync_service import MasterRowsSyncService

            sync_service = MasterRowsSyncService()
            sync_result = sync_service.sync_master_rows(
                form_no=form_code,
                company_id=company_id,
                verbose=False
            )

            if not sync_result['success']:
                print(
                    f"   ⚠️ Master rows sync had issues: {sync_result.get('error')}")
            else:
                print(
                    f"   ✅ Master rows synced: {sync_result['rows_synced']} rows")

            # Step 6: Query master_rows to get canonical master_row_ids for each cluster
            # CRITICAL: Now using master_rows.master_row_id (NOT master_mapping.id)
            print(f"   Fetching canonical master_row_ids from master_rows...")
            query = text("""
                SELECT cluster_label, master_row_id
                FROM master_rows
                WHERE cluster_label IS NOT NULL
            """)

            with self.db.engine.connect() as conn:
                result = conn.execute(query)
                cluster_to_master_row_id = {row[0]: row[1] for row in result}

            # Step 7: Update master_row_id in reports_l*_extracted to use canonical master_rows.master_row_id
            print(
                f"   Updating master_row_ids in reports_{table_key}_extracted...")
            updates_master_ids = []

            for _, row in df.iterrows():
                cluster_label = row['cluster_label']
                if cluster_label in cluster_to_master_row_id:
                    master_row_id = cluster_to_master_row_id[cluster_label]
                    updates_master_ids.append((row['id'], master_row_id))

            if updates_master_ids:
                self.db.update_master_row_ids(updates_master_ids)

            print(f"✅ Targeted mapping complete")
            print(f"   Master mappings created: {len(all_mappings)}")
            print(f"   Rows mapped: {len(updates_master_ids)}")

            return {
                'success': True,
                'master_rows_created': len(all_mappings),
                'rows_mapped': len(updates_master_ids)
            }

        except Exception as e:
            import traceback
            error_msg = f"Targeted mapping failed: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"❌ Traceback: {traceback.format_exc()}")

            return {
                'success': False,
                'error': error_msg
            }


# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    try:
        pipeline = MasterMappingPipeline()

        # Process L-2-A form (change as needed)
        pipeline.run(form_no="L-2-A")

        # Optionally process other forms
        # pipeline.run(form_no="L-6A")
        # pipeline.run(form_no="L-10")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
