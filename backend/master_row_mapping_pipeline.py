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
        Normalize text using NLP techniques

        Steps:
        1. Lowercase
        2. Remove numbering: (a), (b), (i), (ii), 1., 2., etc.
        3. Remove punctuation (except spaces)
        4. Remove stopwords
        5. Light stemming (simple suffix removal)
        6. Remove extra whitespace

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

        # Remove numbering patterns: (a), (b), (i), (ii), 1., 2., etc.
        text = re.sub(r'\([a-z]{1,3}\)', '', text)  # (a), (b), (ii)
        text = re.sub(r'\d+\.', '', text)  # 1., 2., 3.
        text = re.sub(r'[ivxlcdm]+\.', '', text)  # i., ii., iii.

        # Remove special characters but keep spaces and hyphens
        text = re.sub(r'[^\w\s-]', ' ', text)

        # Tokenize
        tokens = text.split()

        # Remove stopwords
        tokens = [t for t in tokens if t not in stopwords and len(t) > 2]

        # Simple stemming (remove common suffixes)
        stemmed = []
        for token in tokens:
            # Remove plural 's'
            if token.endswith('s') and len(token) > 4:
                token = token[:-1]
            # Remove 'ing'
            if token.endswith('ing') and len(token) > 6:
                token = token[:-3]
            # Remove 'ed'
            if token.endswith('ed') and len(token) > 5:
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

    def get_extracted_rows(self, form_no: str) -> pd.DataFrame:
        """
        Fetch all distinct rows from reports_l2_extracted for a form

        Args:
            form_no: L-form number (e.g., 'L-2-A')

        Returns:
            DataFrame with columns: id, report_id, company_id, particulars, normalized_text
        """
        query = text("""
            SELECT DISTINCT
                e.id,
                e.report_id,
                e.company_id,
                e.particulars,
                e.normalized_text,
                e.master_row_id,
                r.form_no
            FROM reports_l2_extracted e
            JOIN reports_l2 r ON e.report_id = r.id
            WHERE r.form_no = :form_no
                AND e.particulars IS NOT NULL
                AND e.particulars != ''
            ORDER BY e.company_id, e.particulars
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
            DataFrame with columns: id, report_id, company_id, particulars, normalized_text
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
                master_row_id
            FROM {extracted_table}
            WHERE company_id = :company_id
                AND report_id IN ({placeholders})
                AND particulars IS NOT NULL
                AND particulars != ''
            ORDER BY report_id, id
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
        Get or create master_row_id for each cluster

        Returns:
            Dict mapping cluster_label -> master_row_id
        """
        query = text("""
            SELECT cluster_label, MIN(id) as master_row_id
            FROM master_mapping
            WHERE form_no = :form_no
            GROUP BY cluster_label
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query, {"form_no": form_no})
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

        # Step 3: Cluster rows
        print("\n🤖 Step 3: Clustering rows...")

        # Group by company for better clustering
        all_mappings = []
        cluster_offset = 0  # Ensure unique cluster IDs across companies

        for company_id in df['company_id'].unique():
            print(f"\n  📊 Processing company_id: {company_id}")
            company_df = df[df['company_id'] == company_id].copy()

            # Get unique normalized texts
            unique_texts = company_df['normalized_text'].unique().tolist()

            if len(unique_texts) == 0:
                continue

            # Cluster
            cluster_labels, similarity_matrix = self.clusterer.fit_predict(
                unique_texts)

            # Adjust cluster labels to be globally unique
            cluster_labels = cluster_labels + cluster_offset
            cluster_offset = cluster_labels.max() + 1

            # Map normalized_text -> cluster_label
            text_to_cluster = dict(zip(unique_texts, cluster_labels))
            company_df['cluster_label'] = company_df['normalized_text'].map(
                text_to_cluster)

            # Step 4: Create master mappings
            print(f"  📝 Creating master mappings...")

            for cluster_id in np.unique(cluster_labels):
                # Get all rows in this cluster
                cluster_mask = company_df['cluster_label'] == cluster_id
                cluster_rows = company_df[cluster_mask]

                # Get texts for this cluster
                cluster_texts = cluster_rows['particulars'].tolist()
                cluster_normalized = cluster_rows['normalized_text'].tolist()

                # Get similarity submatrix for this cluster
                cluster_indices = [unique_texts.index(
                    t) for t in cluster_normalized]
                cluster_sim_matrix = similarity_matrix[np.ix_(
                    cluster_indices, cluster_indices)]

                # Choose representative (master) text
                master_text, master_normalized = self.clusterer.get_cluster_representative(
                    cluster_texts, cluster_normalized, cluster_sim_matrix
                )

                # Compute fuzzy match scores for all variants
                for _, row in cluster_rows.iterrows():
                    similarity_score = fuzz.ratio(
                        row['normalized_text'],
                        master_normalized
                    ) / 100.0  # Convert to 0-1 scale

                    all_mappings.append({
                        'master_name': master_text,
                        'company_id': int(company_id),
                        'form_no': form_no,
                        'variant_text': row['particulars'],
                        'normalized_text': row['normalized_text'],
                        'cluster_label': int(cluster_id),
                        'similarity_score': float(similarity_score)
                    })

        # Step 5: Upsert master mappings
        print("\n💾 Step 4: Upserting master mappings...")
        self.db.upsert_master_mapping(all_mappings)

        # Step 6: Update master_row_ids
        print("\n🔗 Step 5: Updating master_row_ids...")
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

            # Step 3: Cluster rows
            print(f"   Clustering rows...")
            unique_texts = df['normalized_text'].unique().tolist()

            if len(unique_texts) == 0:
                return {
                    'success': True,
                    'master_rows_created': 0,
                    'rows_mapped': 0,
                    'message': 'No unique texts to cluster'
                }

            cluster_labels, similarity_matrix = self.clusterer.fit_predict(
                unique_texts)

            # Map normalized_text -> cluster_label
            text_to_cluster = dict(zip(unique_texts, cluster_labels))
            df['cluster_label'] = df['normalized_text'].map(text_to_cluster)

            # Step 4: Create master mappings
            print(f"   Creating master mappings...")
            all_mappings = []
            cluster_to_master_id = {}

            for cluster_id in np.unique(cluster_labels):
                cluster_mask = df['cluster_label'] == cluster_id
                cluster_rows = df[cluster_mask]

                cluster_texts = cluster_rows['particulars'].tolist()
                cluster_normalized = cluster_rows['normalized_text'].tolist()

                cluster_indices = [unique_texts.index(
                    t) for t in cluster_normalized]
                cluster_sim_matrix = similarity_matrix[np.ix_(
                    cluster_indices, cluster_indices)]

                master_text, master_normalized = self.clusterer.get_cluster_representative(
                    cluster_texts, cluster_normalized, cluster_sim_matrix
                )

                for _, row in cluster_rows.iterrows():
                    similarity_score = fuzz.ratio(
                        row['normalized_text'],
                        master_normalized
                    ) / 100.0

                    all_mappings.append({
                        'master_name': master_text,
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

            # Step 6: Query for the inserted mappings to get their IDs
            print(f"   Fetching master mapping IDs...")
            query = text("""
                SELECT id, company_id, form_no, variant_text, normalized_text, cluster_label
                FROM master_mapping
                WHERE company_id = :company_id AND form_no = :form_no
            """)

            with self.db.engine.connect() as conn:
                result = conn.execute(
                    query, {'company_id': company_id, 'form_no': form_code})
                fetched_mappings = [dict(row._mapping) for row in result]

            # Build a lookup from (cluster_label, normalized_text, variant_text) -> master_row_id
            for mapping in fetched_mappings:
                key = (mapping['cluster_label'],
                       mapping['normalized_text'], mapping['variant_text'])
                cluster_to_master_id[key] = mapping['id']

            # Step 7: Update master_row_id in reports_l*_extracted
            print(f"   Updating master_row_ids...")
            updates_master_ids = []

            for _, row in df.iterrows():
                key = (row['cluster_label'],
                       row['normalized_text'], row['particulars'])
                if key in cluster_to_master_id:
                    master_row_id = cluster_to_master_id[key]
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
