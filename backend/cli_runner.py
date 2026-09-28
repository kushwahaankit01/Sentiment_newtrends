import questionary
from phases.phase1_single_keyword import single_keyword_analysis
from phases.phase2_multi_keyword import compare_keywords, compare_entities_keywords
from phases.phase3_digest import run_phase5
from phases.phase4_trends import compute_trends, sentiment_alerts
from phases.phase5_combined_story import run_all_keywords
from phases.phase6_clustering import run_dbscan_pipeline
from phases.phase7_forecasting import run_phase7

from config import db

# --------------------------
# Central Keywords List
# --------------------------
KEYWORDS = [
    "Artificial Intelligence",
    "ChatGPT",
    "Climate Change",
    "Elections",
    "Healthcare",
    "Startups",
    "Cybersecurity"
]

# --------------------------
# Runner for Phase 1
# --------------------------
def run_phase1_example():
    kw = questionary.select(
        "Select a keyword for Phase 1 analysis:",
        choices=KEYWORDS
    ).ask()

    print(f"========== Phase 1: Single analysis for {kw} ==========")
    df = single_keyword_analysis(kw, limit=500)
    print(df.head())


# --------------------------
# Runner for Phase 2
# --------------------------
def run_phase2_example():
    kw1 = questionary.select(
        "Select the first keyword for Phase 2 comparison:",
        choices=KEYWORDS
    ).ask()

    kw2 = questionary.select(
        "Select the second keyword for Phase 2 comparison:",
        choices=[k for k in KEYWORDS if k != kw1]  # exclude the first one
    ).ask()

    print(f"========== Phase 2: Comparing {kw1} vs {kw2} ==========")
    compare_keywords(kw1, kw2)
    compare_entities_keywords(kw1, kw2)


# --------------------------
# Runner for Phase 3
# --------------------------
def run_phase3_example():
    print("========== Phase 3: Digest ==========")
    results = run_phase5(KEYWORDS)
    for r in results:
        print(r)


# --------------------------
# Runner for Phase 5
# --------------------------
def run_phase5_example():
    print("========== Phase 5: Combined Story ==========")
    results = run_all_keywords(KEYWORDS)
    for r in results:
        print(r)


# --------------------------
# Runner for Phase 4 & 7
# --------------------------
def run_phase4_7_example():
    print("========== Phase 4 & 7: Trends + Alerts ==========")
    phase7_results = run_phase7(KEYWORDS, days=30)
    for kw, data in phase7_results.items():
        print(f"\n📌 Keyword: {kw}")
        print(data["trend"].tail())
        print(data["alerts"])


# --------------------------
# Runner for Phase 6
# --------------------------
def run_phase6_example():
    print("========== Phase 6: Clustering ==========")
    run_dbscan_pipeline(KEYWORDS)


# --------------------------
# MAIN ENTRYPOINT
# --------------------------
if __name__ == "__main__":
    run_phase1_example()
    run_phase2_example()
    run_phase3_example()
    run_phase5_example()
    run_phase4_7_example()
    run_phase6_example()
