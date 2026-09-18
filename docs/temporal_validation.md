# WaterFlow OS — Temporal Validation & Leakage Audit
**Document Version:** 3.0.0-research  
**Classification:** `MACHINE_LEARNING_DATA_HYGIENE`  
**Last Updated:** 2026-09-18  

---

## 1. The Threat of Temporal Data Leakage

In time-series demand forecasting and emergency outage prediction, standard random train/test splitting (e.g. `train_test_split(shuffle=True)`) creates catastrophic data leakage:
- Models observe tomorrow's or next week's unserved demand to predict today's consumption.
- Models ingest future customer complaints to "predict" an outage that already occurred.
- Models achieve artificially inflated accuracy metrics (e.g. $R^2 > 0.98$, $\text{AUC} > 0.99$) that collapse completely in actual live municipal operations.

---

## 2. WaterFlow OS Temporal Invariants

Across all statistical and machine learning models in WaterFlow OS:

### Invariant 1: Strict Chronological Splitting
$$\mathcal{D}_{\text{train}} = \{(\mathbf{x}_t, y_t) \mid t < T_{\text{split}}\}, \quad \mathcal{D}_{\text{test}} = \{(\mathbf{x}_t, y_t) \mid t \ge T_{\text{split}}\}$$
Evaluation is exclusively performed on unseen future calendar dates.

### Invariant 2: Backward-Looking Feature Windows
All feature extractors strictly enforce trailing windows:
- $y_{t-1}, y_{t-2}$: Lags evaluated exclusively on prior days.
- $\bar{y}_{t-7:t-1}$: Rolling statistics strictly exclude day $t$.
- Complaint velocity: Evaluated over trailing $[t - 4\text{ hours}, t]$ interval.

### Invariant 3: Zero Target Peeking
Future tanker delivery outcomes, subsequent valve adjustments, or post-incident repairs are forbidden from entering current-day state vectors.

---

## 3. Audited Verification Checkpoints

1. In `evaluation/demand_forecast.py`:
   - Split date: Final 7 days holdout.
   - Cleaned subset drops initial lag rows ($t < 2$) without imputing from future rows.
   - Test set evaluated chronologically.
2. In `evaluation/emergency_prediction.py`:
   - Outage prediction evaluates $P(\text{outage within next 12 hours})$ strictly using features available at timestamp $t$.
