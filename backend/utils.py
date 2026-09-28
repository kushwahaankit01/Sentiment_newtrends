import os
import json
import random
import datetime
import logging
import warnings
from collections import Counter, defaultdict

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from wordcloud import WordCloud

from transformers import pipeline
from sentence_transformers import SentenceTransformer, util
from prophet import Prophet
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors
from sklearn.manifold import TSNE
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import networkx as nx
from pyvis.network import Network

import spacy
nlp = spacy.load("en_core_web_sm")

# --- Firestore Helper ---
from config import db, COLLECTION

def fetch_docs(keyword=None, limit=None):
    """
    Fetch documents from Firestore and load them into a Pandas DataFrame.
    """
    q = db.collection(COLLECTION)
    if keyword:
        q = q.where("keyword", "==", keyword)
    docs = q.stream()

    rows = []
    for i, d in enumerate(docs):
        if limit and i >= limit:
            break
        rec = d.to_dict()
        rec["_id"] = d.id

        # normalize timestamps
        for ts_field in ("timestamp", "first_seen_date"):
            if ts_field in rec:
                try:
                    rec[f"{ts_field}_dt"] = pd.to_datetime(rec.get(ts_field), utc=True)
                except Exception:
                    rec[f"{ts_field}_dt"] = pd.NaT

        # ensure lists exist
        for listf in ("entities", "keywords"):
            rec[listf] = rec.get(listf) or []

        # numeric sentiment score
        rec["sentiment_score"] = pd.to_numeric(rec.get("sentiment_score"), errors="coerce")

        rows.append(rec)

    return pd.DataFrame(rows)
