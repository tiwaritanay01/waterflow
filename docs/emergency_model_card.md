# Model Card — Severe Water Service Failure & Outage Predictor

## Model Details
- **Model Name:** WaterFlow Emergency Service Disruption Classifier
- **Version:** 2.0.0-research
- **Classification:** `SYNTHETIC-BENCHMARKED`
- **Model Type:** Supervised Binary Classifier (Balanced Random Forest & Regularized Logistic Regression)
- **Framework:** scikit-learn 1.6+ / Python 3.13
- **Primary Developer:** WaterFlow OS Research Team
- **Date:** 2026-09-18

## Intended Use
- **Primary Use:** Predicting the probability $P(\text{severe service disruption within 12 hours})$ at the municipal ward level to trigger preventative tanker pre-positioning and engineering inspections.
- **Target Users:** MCGM Disaster Management Cell, hydraulic engineers, and emergency dispatch coordinators.
- **Out of Scope Uses:** Structural pipeline seismic stress analysis, structural concrete failure mechanics, or real-time automated valve shutoff.

## Data & Provenance
- **Inputs:** Operational failure indicators including complaint velocity, pressure anomalies, estimated pipe age, localized rainfall intensity, heatwave alerts, pump station status, and power outage flags.
- **Ground Truth Labels:** Generated via calibrated non-linear physical interactions representing cascading mechanical and electrical failures.
- **Classification Status:** `SYNTHETIC-BENCHMARKED`. Not trained on real historical SCADA event logs. Real-world predictive accuracy must not be claimed until deployed alongside municipal IoT telemetry.

## Evaluation & Metrics
Evaluated on an out-of-sample holdout split:
- **Baseline Heuristic (Rule Threshold):** Precision: 0.616, Recall: 0.398, F1: 0.484, ROC-AUC: 0.683, PR-AUC: 0.544
- **Balanced Logistic Regression:** Precision: 0.553, Recall: 0.690, F1: 0.614, ROC-AUC: 0.794, PR-AUC: 0.670
- **Balanced Random Forest (100 trees):** Precision: 0.576, Recall: 0.708, F1: 0.635, ROC-AUC: 0.788, PR-AUC: 0.644

The statistical models improve recall from 39.8% to 70.8%, prioritizing the prevention of false negatives (unpredicted catastrophic shortages) in vulnerable populations.

## Limitations & Human Oversight
1. **Emergency Isolation:** The emergency prediction model produces a probability signal and does not silently modify equitable allocation weights.
2. **False Alarm Trade-off:** With high recall in rare-event settings, false positive alarms are inevitable. Human engineers must corroborate alerts before dispatching emergency reserves.
