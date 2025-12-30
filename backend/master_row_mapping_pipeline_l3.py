"""
Master Row Mapping Pipeline for L-3 Forms (Balance Sheet)
===========================================================

This is a specialized version of the master mapping pipeline for L-3 forms.
L-3 forms represent Balance Sheet data with different column structure than L-2.

Key Differences from L-2:
- Columns: as_at_current_period, as_at_previous_period (vs for_period, upto_period)
- Tables: master_rows_l3, master_mapping_l3, reports_l3_extracted
- Form: L-3-A (Balance Sheet) vs L-2-A (Revenue Account)

Usage:
    python master_row_mapping_pipeline_l3.py

Author: Senior Data Engineer
Date: December 30, 2025
"""

import sys
import os
import warnings
import logging
import re
import json
import traceback
import numpy as np
import pandas as pd
from tqdm import tqdm
from rapidfuzz import fuzz, process
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import Dict, List, Tuple, Optional

warnings.filterwarnings('ignore')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================


class ConfigL3:
    """Configuration for the L-3 master mapping pipeline"""

    # L-form to process
    FORM_NO = "L-3-A"  # Balance Sheet

    # NLP Settings
    STOPWORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'could', 'should', 'may', 'might', 'must', 'can', 'shall'
    }

    # Clustering Settings
    CLUSTERING_METHOD = "agglomerative"
    SIMILARITY_THRESHOLD = 0.75
    MIN_SIMILARITY_SCORE = 0.60

    # Agglomerative Clustering params
    AGGLOM_DISTANCE_THRESHOLD = 0.5
    AGGLOM_LINKAGE = "average"

    # DBSCAN params (alternative)
    DBSCAN_EPS = 0.3
    DBSCAN_MIN_SAMPLES = 2


# ============================================================================
# TEXT NORMALIZATION
# ============================================================================

class TextNormalizerL3:
    """Handles NLP-based text normalization for L-3 row names"""

    @staticmethod
    def normalize(text: str, stopwords: set = ConfigL3.STOPWORDS) -> str:
        """Normalize text using NLP techniques"""
        if not text or pd.isna(text):
            return ""

        # Convert to lowercase
        text = str(text).lower().strip()

        # Remove special characters but keep spaces and parentheses
        text = re.sub(r'[^\w\s\(\)\-]', ' ', text)

        # Remove stopwords
        words = text.split()
        words = [w for w in words if w not in stopwords and len(w) > 1]

        # Handle temporal variations (current/previous)
        words = [w.replace('current', 'period').replace(
            'previous', 'period') for w in words]

        # Handle plural/singular
        words = [w.rstrip('s') if len(w) > 3 else w for w in words]

        # Join and clean
        normalized = ' '.join(words)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    @staticmethod
    def batch_normalize(texts: pd.Series) -> pd.Series:
        """Batch normalize a pandas Series of texts"""
        return texts.apply(TextNormalizerL3.normalize)


# ============================================================================
# CLUSTERING ENGINE
# ============================================================================

class RowClustererL3:
    """Handles ML-based clustering of normalized row names for L-3"""

    def __init__(self, method: str = "agglomerative"):
        self.method = method
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 3),
            min_df=1,
            max_df=0.95
        )

    def fit_predict(self, normalized_texts: List[str]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Cluster normalized texts using TF-IDF + ML clustering

        Returns:
            Tuple of (cluster_labels, similarity_matrix)
        """
        if len(normalized_texts) == 0:
            return np.array([]), np.array([[]])

        if len(normalized_texts) == 1:
            return np.array([0]), np.array([[1.0]])

        logger.info(f"  🔧 Vectorizing {len(normalized_texts)} texts...")

        # TF-IDF vectorization
        tfidf_matrix = self.vectorizer.fit_transform(normalized_texts)
        similarity_matrix = cosine_similarity(tfidf_matrix)
        distance_matrix = 1 - similarity_matrix

        logger.info(f"  🤖 Clustering using {self.method}...")

        # Clustering
        if self.method == "agglomerative":
            clusterer = AgglomerativeClustering(
                n_clusters=None,
                distance_threshold=ConfigL3.AGGLOM_DISTANCE_THRESHOLD,
                linkage=ConfigL3.AGGLOM_LINKAGE,
                metric='precomputed'
            )
            labels = clusterer.fit_predict(distance_matrix)

        elif self.method == "dbscan":
            clusterer = DBSCAN(
                eps=ConfigL3.DBSCAN_EPS,
                min_samples=ConfigL3.DBSCAN_MIN_SAMPLES,
                metric='precomputed'
            )
            labels = clusterer.fit_predict(distance_matrix)

        else:
            raise ValueError(f"Unknown clustering method: {self.method}")

        n_clusters = len(np.unique(labels))
        logger.info(f"  ✅ Found {n_clusters} clusters")

        return labels, similarity_matrix

    def get_cluster_representative(
        self,
        cluster_texts: List[str],
        cluster_normalized: List[str],
        similarity_matrix: np.ndarray
    ) -> Tuple[str, str]:
        """Choose the most representative text from a cluster"""
        if len(cluster_texts) == 1:
            return cluster_texts[0], cluster_normalized[0]

        # Compute average similarity for each text
        avg_similarities = similarity_matrix.mean(axis=1)

        # Get top 50% most similar texts
        n_candidates = max(3, len(cluster_texts) // 2)
        top_indices = np.argsort(avg_similarities)[-n_candidates:]

        # Pick the LONGEST text (more complete description)
        best_idx = max(top_indices, key=lambda i: len(cluster_texts[i]))

        return cluster_texts[best_idx], cluster_normalized[best_idx]


# ============================================================================
# DATABASE OPERATIONS FOR L-3
# ============================================================================

class DatabaseManagerL3:
    """Handles all database operations for L-3 forms"""

    def __init__(self):
        """Initialize database connection using existing database config"""
        from databases.database import engine as db_engine
        self.engine = db_engine
        self.Session = sessionmaker(bind=self.engine)

    def get_existing_masters_l3(self, form_no: Optional[str] = None) -> pd.DataFrame:
        """Fetch all existing L-3 master rows"""
        if form_no:
            query = text("""
                SELECT DISTINCT
                    mr.master_row_id,
                    mr.cluster_label,
                    mr.master_name,
                    mm.normalized_text
                FROM master_rows_l3 mr
                LEFT JOIN master_mapping_l3 mm ON mr.cluster_label = mm.cluster_label
                WHERE mm.form_no = :form_no
            """)
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn, params={"form_no": form_no})
        else:
            query = text("""
                SELECT DISTINCT
                    mr.master_row_id,
                    mr.cluster_label,
                    mr.master_name,
                    mm.normalized_text
                FROM master_rows_l3 mr
                LEFT JOIN master_mapping_l3 mm ON mr.cluster_label = mm.cluster_label
            """)
            with self.engine.connect() as conn:
                df = pd.read_sql(query, conn)

        logger.info(f"  📚 Loaded {len(df)} unique existing L-3 master rows")
        return df

    def get_extracted_rows_l3(self, form_no: str) -> pd.DataFrame:
        """Fetch all distinct rows from reports_l3_extracted"""
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
            FROM reports_l3_extracted e
            JOIN reports_l3 r ON e.report_id = r.id
            WHERE r.form_no = :form_no
                AND e.particulars IS NOT NULL
                AND e.particulars != ''
            ORDER BY e.company_id, e.row_index
        """)

        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"form_no": form_no})

        logger.info(f"  📊 Loaded {len(df)} L-3 rows for form {form_no}")
        return df

    def update_normalized_text_l3(self, updates: List[Tuple[int, str]]):
        """Batch update normalized_text in reports_l3_extracted"""
        if not updates:
            return

        query = text("""
            UPDATE reports_l3_extracted
            SET normalized_text = :normalized_text
            WHERE id = :id
        """)

        with self.engine.begin() as conn:
            for row_id, normalized_text in updates:
                conn.execute(
                    query, {"id": row_id, "normalized_text": normalized_text})

        logger.info(f"  ✅ Updated {len(updates)} normalized_text values in L-3")

    def upsert_master_mapping_l3(self, mappings: List[Dict]):
        """Insert or update master_mapping_l3 table"""
        if not mappings:
            return

        # Prepare batch insert
        query = text("""
            INSERT INTO master_mapping_l3 
            (master_name, company_id, form_no, variant_text, normalized_text, cluster_label, similarity_score)
            VALUES 
            (:master_name, :company_id, :form_no, :variant_text, :normalized_text, :cluster_label, :similarity_score)
            ON DUPLICATE KEY UPDATE
                master_name = VALUES(master_name),
                normalized_text = VALUES(normalized_text),
                cluster_label = VALUES(cluster_label),
                similarity_score = VALUES(similarity_score),
                updated_at = CURRENT_TIMESTAMP
        """)

        with self.engine.begin() as conn:
            conn.execute(query, mappings)

        logger.info(
            f"  ✅ Upserted {len(mappings)} mappings into master_mapping_l3")

    def get_cluster_master_row_ids_l3(self, form_no: str) -> Dict[int, int]:
        """Get mapping of cluster_label -> master_row_id for L-3"""
        query = text("""
            SELECT cluster_label, master_row_id
            FROM master_rows_l3
            WHERE cluster_label IS NOT NULL
        """)

        with self.engine.connect() as conn:
            result = conn.execute(query)
            mapping = {row[0]: row[1] for row in result}

        return mapping

    def update_master_row_ids_l3(self, updates: List[Tuple[int, int]]):
        """Update master_row_id in reports_l3_extracted"""
        if not updates:
            return

        query = text("""
            UPDATE reports_l3_extracted
            SET master_row_id = :master_row_id
            WHERE id = :id
        """)

        with self.engine.begin() as conn:
            for row_id, master_row_id in updates:
                conn.execute(
                    query, {"id": row_id, "master_row_id": master_row_id})

        logger.info(f"  ✅ Updated {len(updates)} master_row_id values in L-3")


# ============================================================================
# MAIN PIPELINE FOR L-3
# ============================================================================

class MasterMappingPipelineL3:
    """Main pipeline orchestrator for L-3 forms"""

    def __init__(self):
        self.db = DatabaseManagerL3()
        self.normalizer = TextNormalizerL3()
        self.clusterer = RowClustererL3()

    def run(self, form_no: str = ConfigL3.FORM_NO):
        """
        Run the complete L-3 master mapping pipeline

        Steps:
        1. Fetch extracted rows
        2. Normalize text
        3. Cluster similar rows
        4. Create master rows
        5. Update mappings
        6. Update master_row_id references
        """
        logger.info(f"\n{'='*70}")
        logger.info(f"🚀 Starting L-3 Master Mapping Pipeline for {form_no}")
        logger.info(f"{'='*70}\n")

        try:
            # Step 1: Fetch data
            logger.info("📊 Step 1: Fetching extracted rows from reports_l3_extracted...")
            df = self.db.get_extracted_rows_l3(form_no)

            if df.empty:
                logger.warning(
                    f"⚠️  No extracted rows found for form {form_no}")
                return

            # Step 2: Normalize text
            logger.info("\n🔧 Step 2: Normalizing text...")
            df['normalized_text_new'] = self.normalizer.batch_normalize(
                df['particulars'])

            # Update database with new normalized texts
            updates = [(row['id'], row['normalized_text_new'])
                       for _, row in df.iterrows()]
            self.db.update_normalized_text_l3(updates)
            df['normalized_text'] = df['normalized_text_new']

            # Step 3: Cluster
            logger.info("\n🤖 Step 3: Clustering similar rows...")
            normalized_texts = df['normalized_text'].tolist()
            cluster_labels, similarity_matrix = self.clusterer.fit_predict(
                normalized_texts)

            df['cluster_label'] = cluster_labels

            # Step 4: Create master rows
            logger.info("\n📝 Step 4: Creating master rows and mappings...")
            mappings = []

            for cluster_id in tqdm(np.unique(cluster_labels), desc="Processing clusters"):
                cluster_mask = df['cluster_label'] == cluster_id
                cluster_df = df[cluster_mask]

                # Get representative text
                cluster_texts = cluster_df['particulars'].tolist()
                cluster_normalized = cluster_df['normalized_text'].tolist()
                cluster_sim_matrix = similarity_matrix[cluster_mask][:, cluster_mask]

                master_name, master_normalized = self.clusterer.get_cluster_representative(
                    cluster_texts, cluster_normalized, cluster_sim_matrix
                )

                # Create mapping entries
                for _, row in cluster_df.iterrows():
                    similarity = fuzz.ratio(
                        row['normalized_text'], master_normalized) / 100.0

                    mappings.append({
                        'master_name': master_name,
                        'company_id': int(row['company_id']),
                        'form_no': form_no,
                        'variant_text': row['particulars'],
                        'normalized_text': row['normalized_text'],
                        'cluster_label': int(cluster_id),
                        'similarity_score': float(similarity)
                    })

            # Step 5: Upsert mappings
            logger.info("\n💾 Step 5: Upserting master mappings...")
            self.db.upsert_master_mapping_l3(mappings)

            # Step 6: Update master_row_id
            logger.info("\n🔗 Step 6: Updating master_row_id references...")
            cluster_to_master = self.db.get_cluster_master_row_ids_l3(form_no)

            master_updates = []
            for _, row in df.iterrows():
                cluster_id = int(row['cluster_label'])
                if cluster_id in cluster_to_master:
                    master_row_id = cluster_to_master[cluster_id]
                    master_updates.append((row['id'], master_row_id))

            self.db.update_master_row_ids_l3(master_updates)

            # Summary
            logger.info(f"\n{'='*70}")
            logger.info(f"✅ L-3 Master Mapping Pipeline Completed Successfully!")
            logger.info(f"{'='*70}")
            logger.info(f"📊 Total rows processed: {len(df)}")
            logger.info(f"🏷️  Total clusters created: {len(np.unique(cluster_labels))}")
            logger.info(f"🔗 Master row ID references updated: {len(master_updates)}")
            logger.info(f"{'='*70}\n")

        except Exception as e:
            logger.error(f"\n❌ Error in L-3 pipeline: {e}")
            logger.error(traceback.format_exc())
            raise


# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    try:
        pipeline = MasterMappingPipelineL3()
        pipeline.run(form_no=ConfigL3.FORM_NO)

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
