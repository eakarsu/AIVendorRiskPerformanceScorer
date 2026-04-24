const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// GET aggregated risk data per supplier for heatmap
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.country, s.financial_health_score, s.risk_level,
        COALESCE((SELECT AVG(risk_score) FROM geopolitical_risks WHERE supplier_id = s.id), 0) AS geo_risk,
        COALESCE((SELECT AVG(overall_score) FROM esg_compliance WHERE supplier_id = s.id), 0) AS esg_score,
        COALESCE((SELECT COUNT(*) FILTER (WHERE on_time = true) * 100.0 / NULLIF(COUNT(*), 0) FROM delivery_performance WHERE supplier_id = s.id), 0) AS delivery_rate,
        COALESCE((SELECT COUNT(*) FROM risk_alerts WHERE supplier_id = s.id AND status = 'Open'), 0) AS open_alerts
       FROM suppliers s
       ORDER BY s.financial_health_score ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
