import pandas as pd
import joblib
import numpy as np
from pathlib import Path

MODEL_PATH = Path("pipeline.joblib")  # update path if needed

# Load pipeline
pipeline = joblib.load(MODEL_PATH)

# New data must be cleaned the same way you cleaned training data:
# - timestamp parsed to datetime
# - numeric columns cleaned and converted to numeric
# - have columns: density_kg_m3, pressure_diff_kpa, pressure_kpa,
#   temperature_c, hourly_flow_m3, total_flow_m3
# - create hour and day_of_week columns

def preprocess_new_df(df):
    # ensure timestamp exists and parsed
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', dayfirst=True)
    df.dropna(subset=['timestamp'], inplace=True)
    # numeric cleanup (remove non-digit characters)
    numeric_cols = [
        "density_kg_m3", "pressure_diff_kpa", "pressure_kpa",
        "temperature_c", "hourly_flow_m3", "total_flow_m3"
    ]
    for c in numeric_cols:
        df[c] = df[c].astype(str).str.replace(r"[^0-9\.\-eE]+", "", regex=True)
        df[c] = pd.to_numeric(df[c], errors='coerce')
    # drop rows that still have NaNs in required numeric cols
    df.dropna(subset=numeric_cols, inplace=True)
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    return df

# Example: read incoming CSV
new_df = pd.read_csv("incoming_new_data.csv")
new_df = preprocess_new_df(new_df)

feature_cols = [
    "density_kg_m3", "pressure_diff_kpa", "pressure_kpa",
    "temperature_c", "hourly_flow_m3", "total_flow_m3",
    "hour", "day_of_week"
]

X_new = new_df[feature_cols]

# Predict: IsolationForest.predict -> 1 (normal) or -1 (outlier)
pred_raw = pipeline.named_steps['iforest'].predict(pipeline.named_steps['scaler'].transform(X_new))
scores_raw = pipeline.named_steps['iforest'].decision_function(pipeline.named_steps['scaler'].transform(X_new))

new_df['anomaly_label'] = np.where(pred_raw == -1, 1, 0)
new_df['anomaly_score'] = -scores_raw  # higher -> more anomalous (by construction here)

# Save or send results
new_df.to_csv("new_data_with_anomalies.csv", index=False)
