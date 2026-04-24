const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

// Export suppliers
router.get('/suppliers', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, country, industry, revenue, credit_rating, stock_symbol, financial_health_score, risk_level, notes, created_at FROM suppliers ORDER BY name');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=suppliers.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export delivery performance
router.get('/delivery', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, s.name as supplier_name, d.order_id, d.promised_date, d.actual_date,
        d.quantity_ordered, d.quantity_delivered, d.quality_score, d.on_time, d.notes, d.created_at
      FROM delivery_performance d
      LEFT JOIN suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=delivery_performance.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export geopolitical risks
router.get('/geopolitical', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.id, s.name as supplier_name, g.country, g.region, g.risk_score,
        g.political_stability, g.trade_restrictions, g.sanctions_status, g.conflict_zone,
        g.currency_risk, g.regulatory_risk, g.notes, g.created_at
      FROM geopolitical_risks g
      LEFT JOIN suppliers s ON g.supplier_id = s.id
      ORDER BY g.risk_score DESC
    `);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=geopolitical_risks.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export ESG compliance
router.get('/esg', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, s.name as supplier_name, e.environmental_score, e.social_score,
        e.governance_score, e.overall_score, e.carbon_footprint, e.labor_practices,
        e.board_diversity, e.sustainability_report, e.compliance_status, e.certifications, e.notes, e.created_at
      FROM esg_compliance e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      ORDER BY e.overall_score DESC
    `);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=esg_compliance.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export contracts
router.get('/contracts', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, s.name as supplier_name, c.contract_number, c.contract_type,
        c.start_date, c.end_date, c.value, c.status, c.payment_terms, c.auto_renewal, c.notes, c.created_at
      FROM vendor_contracts c
      LEFT JOIN suppliers s ON c.supplier_id = s.id
      ORDER BY c.end_date DESC
    `);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contracts.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export spend analysis
router.get('/spend', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sa.id, s.name as supplier_name, sa.period, sa.category, sa.amount,
        sa.budget, sa.currency, sa.department, sa.notes, sa.created_at
      FROM spend_analysis sa
      LEFT JOIN suppliers s ON sa.supplier_id = s.id
      ORDER BY sa.created_at DESC
    `);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=spend_analysis.csv');
    res.send(toCsv(result.rows));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
