# Audit Recommendations & Status — AIVendorRiskPerformanceScorer

Source: /Users/erolakarsu/projects/_AUDIT/reports/batch_08.md (section 25)

Verdict per audit: substantive (5 AI endpoints, 22 non-AI routes).

## Original audit recommendations

Missing AI counterparts:
- Predictive bankruptcy scoring
- Supply chain network risk analysis

Missing non-AI:
- Dun & Bradstreet / financial-data provider integration
- Supplier onboarding workflow with automated document collection
- Self-service supplier portal
- Third-party risk aggregation (PCI, certifications)

Custom feature ideas:
- Financial distress prediction
- Supply chain network risk
- ESG controversy monitoring (real-time)
- Supplier consolidation recommender
- Risk-adjusted pricing leverage

## Implemented in this pass (MECHANICAL)

Added two new endpoints to existing `backend/src/routes/ai.js` matching its style (uses `pool`, `authMiddleware`, inline `callOpenRouter`).

- `POST /api/ai/bankruptcy-prediction` — financial-distress probability + driver narrative.
- `POST /api/ai/network-risk` — supply-chain network risk / single-point-of-failure analysis.

(No new files; one route file edited.)

## Backlog

1. ESG controversy monitoring — needs external news feed.
2. Supplier consolidation recommender — could be added similarly but needs richer dataset to be useful.
3. Risk-adjusted pricing tool — product decision.
4. D&B / external financial data integration — credentials decision.
5. Onboarding workflow + supplier portal — substantial product work.

## Apply pass 3 (frontend)

**Action:** LEFT-AS-IS — FE already wired.

Verified `frontend/src/pages/AIAnalysis.js` is a unified front-door that posts to `/ai/${analysisType}` for the five "analysis" endpoints (financial, delivery, geopolitical, ESG, comprehensive-risk). Dedicated pages `BankruptcyPrediction.js` and `NetworkRisk.js` cover the two pass-2-added endpoints. All pages routed in `App.js` (e.g. `/ai-analysis`, `/bankruptcy`, `/network-risk`). Auth via shared `src/api.js` axios client which reads `localStorage.getItem('token')`.

No FE files modified.

## Apply pass 4 (mechanical backlog)

Promoted two backlog items to MECHANICAL scope and implemented them.

**Backend** (`backend/src/routes/ai.js`, reuses inline `callOpenRouter` + `authMiddleware`; both endpoints return 503 when `OPENROUTER_API_KEY` is missing):
- `POST /api/ai/consolidation-recommendation` — supplier consolidation opportunities; optional filters by `category`/`country`; pulls spend from `spend_analysis`.
- `POST /api/ai/esg-controversy-watch` — ESG controversy exposure scan; reads `esg_compliance` + `risk_alerts` history.

**Frontend**:
- New pages `src/pages/ConsolidationRecommendation.js` and `src/pages/ESGControversyWatch.js` (match existing page style, use shared `api` axios client + `AIOutput`).
- Routes added in `src/App.js` at `/consolidation` and `/esg-controversy`.
- Sidebar entries added in `src/components/Layout.js` Intelligence section.

**Smoke test:** Started backend on :3001 with `OPENROUTER_API_KEY=""`; logged in admin@vendorrisk.com; both endpoints returned HTTP 503 with the documented "AI service not configured" message. Confirms 503 path. Server cleaned up.

## Apply pass 5 (all backlog)

Promoted Risk-Adjusted Pricing Leverage (PRODUCT-DECISION) to advisory implementation.

**Backend** (`backend/src/routes/ai.js`, reuses inline `callOpenRouter` + `authMiddleware`; 503 when `OPENROUTER_API_KEY` missing):
- `POST /api/ai/risk-adjusted-pricing` — PRODUCT-DECISION: advisory only (suggests pct_adjustment). Output `pct_adjustment` is server-clamped to `[-30, +20]` to prevent unrealistic recommendations. Reads `spend_analysis`, `risk_alerts`, `delivery_performance` for the supplier.

**Frontend**:
- New page `frontend/src/pages/RiskAdjustedPricing.js` (matches existing pages + uses shared `api` axios client + `AIOutput`).
- Route added in `src/App.js` at `/risk-adjusted-pricing`.
- Sidebar entry added in `components/Layout.js` Intelligence section.

**Smoke test:** Started backend on port 4114 with `OPENROUTER_API_KEY=""`; login admin@vendorrisk.com/password123 → 200; new endpoint → 503 with `missing: OPENROUTER_API_KEY`. Server cleaned up.

Backlog updated:
- Risk-adjusted pricing → done.
- Remaining: ESG news feed (NEEDS-CREDS), D&B financial-data integration (NEEDS-CREDS), supplier onboarding workflow + portal (NEEDS-PRODUCT-DECISION).
