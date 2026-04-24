const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// POST compare suppliers by ids
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { supplier_ids } = req.body;
    if (!supplier_ids || !Array.isArray(supplier_ids) || supplier_ids.length === 0) {
      return res.status(400).json({ error: 'supplier_ids must be a non-empty array' });
    }

    const result = await pool.query(
      `SELECT s.id, s.name, s.country, s.industry, s.revenue, s.credit_rating, s.risk_level, s.financial_health_score,
        COALESCE((SELECT AVG(risk_score) FROM geopolitical_risks WHERE supplier_id = s.id), 0) AS geo_risk,
        COALESCE((SELECT AVG(overall_score) FROM esg_compliance WHERE supplier_id = s.id), 0) AS esg_score,
        COALESCE((SELECT COUNT(*) FILTER (WHERE on_time = true) * 100.0 / NULLIF(COUNT(*), 0) FROM delivery_performance WHERE supplier_id = s.id), 0) AS delivery_rate,
        COALESCE((SELECT SUM(value) FROM vendor_contracts WHERE supplier_id = s.id), 0) AS total_contract_value,
        COALESCE((SELECT COUNT(*) FROM risk_alerts WHERE supplier_id = s.id AND status = 'Open'), 0) AS open_alerts
       FROM suppliers s
       WHERE s.id = ANY($1)
       ORDER BY s.name ASC`,
      [supplier_ids]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
