const express = require('express');
const fetch = require('node-fetch');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const callOpenRouter = async (prompt, systemPrompt) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Vendor Risk Scorer'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
};

// AI Financial Health Analysis
router.post('/financial-analysis', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplier.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supplier.rows[0];

    const prompt = `Analyze the financial health of this supplier:
Name: ${s.name}
Country: ${s.country}
Industry: ${s.industry}
Revenue: $${s.revenue}M
Credit Rating: ${s.credit_rating}
Stock Symbol: ${s.stock_symbol}
Current Health Score: ${s.financial_health_score}/100
Risk Level: ${s.risk_level}

Provide a comprehensive financial health analysis including:
1. Overall Financial Assessment
2. Key Risk Indicators
3. Revenue Stability Analysis
4. Credit Worthiness Evaluation
5. Recommendations for Risk Mitigation
6. Predicted 12-Month Outlook

Format the response with clear sections and bullet points.`;

    const systemPrompt = 'You are an expert financial analyst specializing in vendor risk assessment and supply chain finance. Provide detailed, actionable analysis.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Delivery Performance Analysis
router.post('/delivery-analysis', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const deliveries = await pool.query(`
      SELECT d.*, s.name as supplier_name FROM delivery_performance d
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      WHERE d.supplier_id = $1 ORDER BY d.actual_date DESC LIMIT 20
    `, [supplier_id]);

    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    const s = supplier.rows[0];
    const records = deliveries.rows;

    const onTimeRate = records.length > 0 ? (records.filter(r => r.on_time).length / records.length * 100).toFixed(1) : 0;
    const avgQuality = records.length > 0 ? (records.reduce((sum, r) => sum + parseFloat(r.quality_score || 0), 0) / records.length).toFixed(1) : 0;

    const prompt = `Analyze delivery performance for supplier "${s.name}":
Total deliveries tracked: ${records.length}
On-time delivery rate: ${onTimeRate}%
Average quality score: ${avgQuality}/100
Recent delivery records: ${JSON.stringify(records.slice(0, 5).map(r => ({
  order: r.order_id, promised: r.promised_date, actual: r.actual_date,
  qty_ordered: r.quantity_ordered, qty_delivered: r.quantity_delivered,
  quality: r.quality_score, on_time: r.on_time
})))}

Provide:
1. Delivery Reliability Assessment
2. Quality Trend Analysis
3. Fulfillment Rate Evaluation
4. Risk Flags and Concerns
5. Performance Improvement Recommendations
6. Comparative Industry Benchmarking`;

    const systemPrompt = 'You are a supply chain performance analyst. Provide data-driven insights on delivery performance and reliability.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s, stats: { onTimeRate, avgQuality, totalDeliveries: records.length } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Geopolitical Risk Analysis
router.post('/geopolitical-analysis', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const risks = await pool.query(`
      SELECT g.*, s.name as supplier_name FROM geopolitical_risks g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      WHERE g.supplier_id = $1
    `, [supplier_id]);

    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    const s = supplier.rows[0];

    const prompt = `Analyze geopolitical risks for supplier "${s.name}" based in ${s.country}:
Risk Records: ${JSON.stringify(risks.rows.map(r => ({
  country: r.country, region: r.region, risk_score: r.risk_score,
  political_stability: r.political_stability, trade_restrictions: r.trade_restrictions,
  sanctions: r.sanctions_status, conflict_zone: r.conflict_zone,
  currency_risk: r.currency_risk, regulatory_risk: r.regulatory_risk
})))}

Provide:
1. Overall Geopolitical Risk Assessment
2. Political Stability Analysis
3. Trade & Sanctions Risk Evaluation
4. Currency & Economic Risk
5. Regulatory Compliance Outlook
6. Supply Chain Diversification Recommendations
7. Contingency Planning Suggestions`;

    const systemPrompt = 'You are a geopolitical risk analyst specializing in global supply chain risk assessment. Provide strategic insights on geopolitical threats to supply chain operations.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s, risks: risks.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI ESG Compliance Analysis
router.post('/esg-analysis', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const esg = await pool.query(`
      SELECT e.*, s.name as supplier_name FROM esg_compliance e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.supplier_id = $1
    `, [supplier_id]);

    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    const s = supplier.rows[0];

    const prompt = `Analyze ESG compliance for supplier "${s.name}":
ESG Records: ${JSON.stringify(esg.rows.map(r => ({
  environmental: r.environmental_score, social: r.social_score,
  governance: r.governance_score, overall: r.overall_score,
  carbon_footprint: r.carbon_footprint, labor_practices: r.labor_practices,
  board_diversity: r.board_diversity, sustainability_report: r.sustainability_report,
  compliance_status: r.compliance_status, certifications: r.certifications
})))}

Provide:
1. Overall ESG Performance Rating
2. Environmental Impact Assessment
3. Social Responsibility Evaluation
4. Governance Quality Analysis
5. Compliance Gap Identification
6. Improvement Roadmap & Recommendations
7. Industry Comparison & Benchmarking`;

    const systemPrompt = 'You are an ESG (Environmental, Social, Governance) compliance analyst. Provide thorough ESG assessments with actionable recommendations for improvement.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s, esgData: esg.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Comprehensive Risk Score
router.post('/comprehensive-risk', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplier.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supplier.rows[0];

    const deliveries = await pool.query('SELECT * FROM delivery_performance WHERE supplier_id = $1', [supplier_id]);
    const geoRisks = await pool.query('SELECT * FROM geopolitical_risks WHERE supplier_id = $1', [supplier_id]);
    const esg = await pool.query('SELECT * FROM esg_compliance WHERE supplier_id = $1', [supplier_id]);

    const prompt = `Generate a comprehensive vendor risk score for "${s.name}":

FINANCIAL: Revenue $${s.revenue}M, Credit Rating: ${s.credit_rating}, Health Score: ${s.financial_health_score}/100
DELIVERY: ${deliveries.rows.length} records, On-time rate: ${deliveries.rows.length > 0 ? (deliveries.rows.filter(r => r.on_time).length / deliveries.rows.length * 100).toFixed(1) : 'N/A'}%
GEOPOLITICAL: ${geoRisks.rows.length} risk records, Avg score: ${geoRisks.rows.length > 0 ? (geoRisks.rows.reduce((s, r) => s + parseFloat(r.risk_score), 0) / geoRisks.rows.length).toFixed(1) : 'N/A'}
ESG: ${esg.rows.length} records, Avg overall: ${esg.rows.length > 0 ? (esg.rows.reduce((s, r) => s + parseFloat(r.overall_score), 0) / esg.rows.length).toFixed(1) : 'N/A'}

Provide:
1. Comprehensive Risk Score (0-100)
2. Risk Category Breakdown (Financial, Operational, Geopolitical, ESG)
3. Top 5 Critical Risk Factors
4. Strengths & Opportunities
5. Immediate Action Items
6. Strategic Recommendations
7. Risk Trend Prediction (6-month outlook)`;

    const systemPrompt = 'You are a senior vendor risk management consultant. Provide a comprehensive, weighted risk assessment combining financial, operational, geopolitical, and ESG factors.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Bankruptcy / Financial-Distress Prediction
router.post('/bankruptcy-prediction', authMiddleware, async (req, res) => {
  try {
    const { supplier_id } = req.body;
    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplier.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supplier.rows[0];

    const prompt = `Estimate the financial-distress / bankruptcy probability over the next 12 months for this supplier and explain the drivers:
Name: ${s.name}
Country: ${s.country}
Industry: ${s.industry}
Revenue: $${s.revenue}M
Credit Rating: ${s.credit_rating}
Stock Symbol: ${s.stock_symbol}
Current Health Score: ${s.financial_health_score}/100
Risk Level: ${s.risk_level}

Provide:
1. Distress probability (0-100%)
2. Altman-Z-style narrative (qualitative)
3. Top warning signals
4. Mitigating factors
5. Recommended buyer actions (e.g., increase deposit, dual-source, shorten payment terms)
Format as a structured report.`;

    const systemPrompt = 'You are a credit risk analyst specializing in supplier financial distress. Be specific and quantitative where possible.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Supply-Chain-Network Risk Analysis (single point of failure detection)
router.post('/network-risk', authMiddleware, async (req, res) => {
  try {
    const { supplier_id, dependent_skus, alternate_suppliers } = req.body;
    const supplier = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supplier.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supplier.rows[0];
    const spend = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM spend_analysis WHERE supplier_id = $1', [supplier_id]).catch(() => ({ rows: [{ total: 0 }] }));

    const prompt = `Analyze supply-chain network exposure for "${s.name}".
Country: ${s.country}
Industry: ${s.industry}
Annual spend: $${spend.rows[0].total}
Dependent SKUs / categories: ${JSON.stringify(dependent_skus || [])}
Known alternate suppliers: ${JSON.stringify(alternate_suppliers || [])}

Identify:
1. Single-point-of-failure risk score (0-100)
2. Cascading impact scenarios
3. Geographic concentration risk
4. Recommended diversification actions
5. Estimated time-to-recover if this supplier fails
Return a structured analyst-style report.`;

    const systemPrompt = 'You are a supply chain network risk analyst. Focus on concentration risk and contingency planning.';
    const analysis = await callOpenRouter(prompt, systemPrompt);
    res.json({ analysis, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Supplier Consolidation Recommender
router.post('/consolidation-recommendation', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
    }
    const { category, country, top_n } = req.body || {};
    const limit = Math.max(2, Math.min(50, parseInt(top_n) || 25));

    let q = 'SELECT id, name, country, industry, financial_health_score, risk_level, credit_rating FROM suppliers';
    const params = [];
    const where = [];
    if (category) { params.push(category); where.push(`industry = $${params.length}`); }
    if (country) { params.push(country); where.push(`country = $${params.length}`); }
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    params.push(limit);
    q += ` ORDER BY id LIMIT $${params.length}`;

    const suppliers = await pool.query(q, params);
    if (suppliers.rows.length < 2) {
      return res.status(404).json({ error: 'Need at least 2 suppliers for consolidation analysis', count: suppliers.rows.length });
    }

    const spendRows = await pool.query(
      'SELECT supplier_id, COALESCE(SUM(amount),0)::float AS total_spend FROM spend_analysis WHERE supplier_id = ANY($1::int[]) GROUP BY supplier_id',
      [suppliers.rows.map(s => s.id)]
    ).catch(() => ({ rows: [] }));
    const spendMap = Object.fromEntries(spendRows.rows.map(r => [r.supplier_id, r.total_spend]));

    const enriched = suppliers.rows.map(s => ({
      id: s.id,
      name: s.name,
      country: s.country,
      industry: s.industry,
      financial_health_score: s.financial_health_score,
      risk_level: s.risk_level,
      credit_rating: s.credit_rating,
      annual_spend: spendMap[s.id] || 0,
    }));

    const prompt = `Recommend supplier consolidation opportunities across this set.
Filters: category=${category || 'any'}, country=${country || 'any'}.
Suppliers (with risk/performance/spend):
${JSON.stringify(enriched, null, 2)}

For each consolidation opportunity:
- Identify 2-4 suppliers to consolidate
- Pick a recommended primary (the keep)
- Estimate annualized savings (rough %)
- Note risk impact (positive or negative)
- Provide rationale

Return a structured analyst report including a "summary_metrics" section (total_estimated_savings_pct, supplier_count_reduction).`;

    const analysis = await callOpenRouter(prompt, 'You are a strategic sourcing analyst. Quantify trade-offs between consolidation savings and concentration risk.');
    res.json({ analysis, supplier_count: enriched.length, filters: { category: category || null, country: country || null } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI ESG Controversy Watch (over existing supplier data)
router.post('/esg-controversy-watch', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
    }
    const { supplier_id, recent_signals } = req.body || {};
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });

    const supRes = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supRes.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supRes.rows[0];

    const esgRes = await pool.query('SELECT * FROM esg_compliance WHERE supplier_id = $1 ORDER BY id DESC LIMIT 10', [supplier_id]).catch(() => ({ rows: [] }));
    const alertsRes = await pool.query('SELECT * FROM risk_alerts WHERE supplier_id = $1 ORDER BY id DESC LIMIT 10', [supplier_id]).catch(() => ({ rows: [] }));

    const prompt = `Assess ESG controversy exposure for the supplier below.
Supplier: ${JSON.stringify({ id: s.id, name: s.name, country: s.country, industry: s.industry, risk_level: s.risk_level, financial_health_score: s.financial_health_score })}
Recent ESG records: ${JSON.stringify(esgRes.rows)}
Recent alerts: ${JSON.stringify(alertsRes.rows)}
User-supplied signals (may be empty): ${JSON.stringify(recent_signals || [])}

Identify:
1. Likely controversy categories (environmental, labor, governance, social).
2. Severity score (0-100) and trend (rising/stable/declining).
3. Specific issues to monitor proactively.
4. Suggested questionnaire items to send the supplier.
5. Recommended internal escalation level.
Return a structured analyst-style report.`;

    const analysis = await callOpenRouter(prompt, 'You are an ESG risk analyst with experience in controversy monitoring and supplier engagement.');
    res.json({ analysis, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Risk-Adjusted Pricing Leverage
// PRODUCT-DECISION: This endpoint is *advisory* — it suggests a percentage discount/markup
// adjustment based on the supplier's risk + spend profile, NOT a contract change. Real
// negotiation would require approval workflow + contract templates. Multiplier is bounded
// to [-30%, +20%] to prevent unrealistic recommendations.
// Required env: OPENROUTER_API_KEY (returns 503 if missing).
router.post('/risk-adjusted-pricing', authMiddleware, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { supplier_id, current_unit_price, category, annual_spend } = req.body || {};
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });
    const supRes = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplier_id]);
    if (supRes.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const s = supRes.rows[0];

    const spend = await pool.query('SELECT * FROM spend_analysis WHERE supplier_id = $1 ORDER BY id DESC LIMIT 5', [supplier_id]).catch(() => ({ rows: [] }));
    const alerts = await pool.query('SELECT * FROM risk_alerts WHERE supplier_id = $1 ORDER BY id DESC LIMIT 10', [supplier_id]).catch(() => ({ rows: [] }));
    const delivery = await pool.query('SELECT * FROM delivery_performance WHERE supplier_id = $1 ORDER BY actual_date DESC LIMIT 10', [supplier_id]).catch(() => ({ rows: [] }));

    const prompt = `You are a strategic sourcing analyst. Recommend a risk-adjusted pricing position
for an upcoming contract negotiation. Constrain pct_adjustment to [-30, +20]. Return ONLY strict JSON:
{
  "pct_adjustment": <number, negative=discount we should ask for, positive=premium we should accept>,
  "leverage_score": <0-100>,
  "leverage_signals": [{ "signal": string, "direction": "favors_buyer|favors_supplier", "weight": <0-1> }],
  "recommended_position": string,
  "fallback_position": string,
  "risks_of_pushing_too_hard": [string],
  "confidence": "low|medium|high",
  "summary": string
}

Supplier: ${JSON.stringify({ id: s.id, name: s.name, country: s.country, industry: s.industry, risk_level: s.risk_level, financial_health_score: s.financial_health_score, credit_rating: s.credit_rating })}
Category: ${category || 'unspecified'}
Current unit price: ${current_unit_price ?? 'unspecified'}
Annual spend: ${annual_spend ?? 'unspecified'}
Spend snapshots: ${JSON.stringify(spend.rows)}
Recent alerts: ${JSON.stringify(alerts.rows)}
Recent delivery: ${JSON.stringify(delivery.rows)}`;

    const raw = await callOpenRouter(prompt, 'You are a strategic sourcing analyst. Return only strict JSON.');
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
    if (parsed && typeof parsed.pct_adjustment === 'number') {
      parsed.pct_adjustment = Math.max(-30, Math.min(20, parsed.pct_adjustment));
    }
    res.json({ analysis: parsed || raw, raw, supplier: s });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
