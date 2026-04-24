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

module.exports = router;
