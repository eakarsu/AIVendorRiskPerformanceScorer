// Custom Views router: 4 endpoints for vendor risk views
// VIZ: score-distribution, risk-heatmap
// NON-VIZ: assessment-pdf, scoring-rules (CRUD)
const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// In-memory scoring rules store (no schema migration needed)
let _scoringRules = [
  { id: 1, name: 'Financial Health',     weight: 0.30, threshold_high: 80, threshold_low: 40, criteria: 'Credit rating, revenue, financial_health_score' },
  { id: 2, name: 'Delivery Performance', weight: 0.20, threshold_high: 90, threshold_low: 70, criteria: 'On-time %, quality score' },
  { id: 3, name: 'Geopolitical Risk',    weight: 0.20, threshold_high: 70, threshold_low: 30, criteria: 'Country risk, sanctions, conflict' },
  { id: 4, name: 'ESG Compliance',       weight: 0.15, threshold_high: 80, threshold_low: 50, criteria: 'Environmental, social, governance scores' },
  { id: 5, name: 'Open Alerts',          weight: 0.15, threshold_high: 5,  threshold_low: 1,  criteria: 'Active risk alerts count' },
];
let _rulesNextId = 6;

// ---------- VIZ 1: Vendor Score Distribution ----------
// GET /api/custom-views/score-distribution
router.get('/score-distribution', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN financial_health_score >= 90 THEN '90-100'
          WHEN financial_health_score >= 80 THEN '80-89'
          WHEN financial_health_score >= 70 THEN '70-79'
          WHEN financial_health_score >= 60 THEN '60-69'
          WHEN financial_health_score >= 50 THEN '50-59'
          WHEN financial_health_score >= 40 THEN '40-49'
          WHEN financial_health_score >= 30 THEN '30-39'
          ELSE '0-29'
        END AS bucket,
        COUNT(*)::int AS vendor_count,
        ROUND(AVG(financial_health_score)::numeric, 2) AS avg_score
      FROM suppliers
      GROUP BY bucket
      ORDER BY bucket DESC
    `);
    const total = result.rows.reduce((s, r) => s + r.vendor_count, 0);
    const buckets = result.rows.map(r => ({
      bucket: r.bucket,
      vendor_count: r.vendor_count,
      avg_score: Number(r.avg_score),
      pct: total ? Math.round((r.vendor_count / total) * 1000) / 10 : 0,
    }));
    res.json({ total_vendors: total, buckets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- VIZ 2: Risk Category Heatmap (vendor x risk type) ----------
// GET /api/custom-views/risk-heatmap
router.get('/risk-heatmap', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.country,
        s.risk_level,
        (100 - COALESCE(s.financial_health_score, 50))::numeric AS financial_risk,
        COALESCE((SELECT AVG(risk_score) FROM geopolitical_risks WHERE supplier_id = s.id), 50)::numeric AS geopolitical_risk,
        (100 - COALESCE((SELECT AVG(overall_score) FROM esg_compliance WHERE supplier_id = s.id), 50))::numeric AS esg_risk,
        (100 - COALESCE((SELECT COUNT(*) FILTER (WHERE on_time = true) * 100.0 / NULLIF(COUNT(*), 0)
                          FROM delivery_performance WHERE supplier_id = s.id), 80))::numeric AS delivery_risk,
        LEAST(100, COALESCE((SELECT COUNT(*) FROM risk_alerts WHERE supplier_id = s.id AND status = 'Open'), 0) * 20)::numeric AS alert_risk
      FROM suppliers s
      ORDER BY s.name ASC
    `);
    const risk_types = ['financial_risk', 'geopolitical_risk', 'esg_risk', 'delivery_risk', 'alert_risk'];
    const vendors = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      country: r.country,
      risk_level: r.risk_level,
      scores: {
        financial_risk:    Math.round(Number(r.financial_risk)),
        geopolitical_risk: Math.round(Number(r.geopolitical_risk)),
        esg_risk:          Math.round(Number(r.esg_risk)),
        delivery_risk:     Math.round(Number(r.delivery_risk)),
        alert_risk:        Math.round(Number(r.alert_risk)),
      },
    }));
    res.json({ risk_types, vendors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 1: Vendor Assessment PDF (text/plain stand-in) ----------
// GET /api/custom-views/assessment-pdf?supplier_id=1
router.get('/assessment-pdf', authMiddleware, async (req, res) => {
  try {
    const supplierId = parseInt(req.query.supplier_id, 10);
    let supplier;
    if (supplierId) {
      const r = await pool.query('SELECT * FROM suppliers WHERE id = $1', [supplierId]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
      supplier = r.rows[0];
    } else {
      const r = await pool.query('SELECT * FROM suppliers ORDER BY id ASC LIMIT 1');
      supplier = r.rows[0];
    }
    if (!supplier) return res.status(404).json({ error: 'No suppliers available' });

    const geo = await pool.query('SELECT AVG(risk_score) AS s FROM geopolitical_risks WHERE supplier_id = $1', [supplier.id]);
    const esg = await pool.query('SELECT AVG(overall_score) AS s FROM esg_compliance WHERE supplier_id = $1', [supplier.id]);
    const alerts = await pool.query("SELECT COUNT(*)::int AS c FROM risk_alerts WHERE supplier_id = $1 AND status = 'Open'", [supplier.id]);

    const lines = [];
    lines.push('VENDOR RISK ASSESSMENT REPORT');
    lines.push('================================');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push(`Vendor:           ${supplier.name}`);
    lines.push(`Country:          ${supplier.country || 'N/A'}`);
    lines.push(`Industry:         ${supplier.industry || 'N/A'}`);
    lines.push(`Credit Rating:    ${supplier.credit_rating || 'N/A'}`);
    lines.push(`Risk Level:       ${supplier.risk_level || 'Medium'}`);
    lines.push('');
    lines.push('--- Risk Metrics ---');
    lines.push(`Financial Health Score: ${supplier.financial_health_score ?? 'N/A'} / 100`);
    lines.push(`Geopolitical Risk Avg : ${geo.rows[0].s ? Number(geo.rows[0].s).toFixed(1) : 'N/A'} / 100`);
    lines.push(`ESG Overall Score     : ${esg.rows[0].s ? Number(esg.rows[0].s).toFixed(1) : 'N/A'} / 100`);
    lines.push(`Open Risk Alerts      : ${alerts.rows[0].c}`);
    lines.push('');
    lines.push('--- Notes ---');
    lines.push(supplier.notes || 'No additional notes.');
    lines.push('');
    lines.push('Document type: text/plain (PDF stand-in)');
    const body = lines.join('\n');

    if (req.query.format === 'json') {
      return res.json({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        generated_at: new Date().toISOString(),
        content: body,
        bytes: Buffer.byteLength(body, 'utf8'),
      });
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="assessment_${supplier.id}.txt"`);
    res.send(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 2: Risk Scoring Rules (CRUD) ----------
// GET /api/custom-views/scoring-rules
router.get('/scoring-rules', authMiddleware, (req, res) => {
  const totalWeight = _scoringRules.reduce((s, r) => s + Number(r.weight), 0);
  res.json({ rules: _scoringRules, total_weight: Math.round(totalWeight * 1000) / 1000 });
});

// POST /api/custom-views/scoring-rules  -> create
router.post('/scoring-rules', authMiddleware, (req, res) => {
  const { name, weight, threshold_high, threshold_low, criteria } = req.body || {};
  if (!name || weight == null) {
    return res.status(400).json({ error: 'name and weight are required' });
  }
  const rule = {
    id: _rulesNextId++,
    name: String(name),
    weight: Number(weight),
    threshold_high: threshold_high != null ? Number(threshold_high) : null,
    threshold_low:  threshold_low  != null ? Number(threshold_low)  : null,
    criteria: criteria ? String(criteria) : '',
  };
  _scoringRules.push(rule);
  res.status(201).json(rule);
});

// PUT /api/custom-views/scoring-rules/:id -> update
router.put('/scoring-rules/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = _scoringRules.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const { name, weight, threshold_high, threshold_low, criteria } = req.body || {};
  if (name != null)           _scoringRules[idx].name = String(name);
  if (weight != null)         _scoringRules[idx].weight = Number(weight);
  if (threshold_high != null) _scoringRules[idx].threshold_high = Number(threshold_high);
  if (threshold_low != null)  _scoringRules[idx].threshold_low = Number(threshold_low);
  if (criteria != null)       _scoringRules[idx].criteria = String(criteria);
  res.json(_scoringRules[idx]);
});

// DELETE /api/custom-views/scoring-rules/:id
router.delete('/scoring-rules/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const before = _scoringRules.length;
  _scoringRules = _scoringRules.filter(r => r.id !== id);
  if (_scoringRules.length === before) return res.status(404).json({ error: 'Rule not found' });
  res.json({ deleted: true, id });
});

module.exports = router;
