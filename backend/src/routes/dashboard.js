const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const suppliers = await pool.query('SELECT COUNT(*) as count FROM suppliers');
    const highRisk = await pool.query("SELECT COUNT(*) as count FROM suppliers WHERE risk_level = 'Critical' OR risk_level = 'High'");
    const deliveries = await pool.query('SELECT COUNT(*) as count FROM delivery_performance');
    const onTime = await pool.query('SELECT COUNT(*) as count FROM delivery_performance WHERE on_time = true');
    const geoRisks = await pool.query('SELECT COUNT(*) as count FROM geopolitical_risks WHERE risk_score > 70');
    const esgLow = await pool.query('SELECT COUNT(*) as count FROM esg_compliance WHERE overall_score < 50');
    const avgHealth = await pool.query('SELECT COALESCE(AVG(financial_health_score), 0) as avg FROM suppliers');
    const avgEsg = await pool.query('SELECT COALESCE(AVG(overall_score), 0) as avg FROM esg_compliance');

    res.json({
      totalSuppliers: parseInt(suppliers.rows[0].count),
      highRiskSuppliers: parseInt(highRisk.rows[0].count),
      totalDeliveries: parseInt(deliveries.rows[0].count),
      onTimeDeliveries: parseInt(onTime.rows[0].count),
      highGeoRisks: parseInt(geoRisks.rows[0].count),
      lowEsgScores: parseInt(esgLow.rows[0].count),
      avgFinancialHealth: parseFloat(avgHealth.rows[0].avg).toFixed(1),
      avgEsgScore: parseFloat(avgEsg.rows[0].avg).toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/risk-distribution', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT risk_level, COUNT(*) as count
      FROM suppliers
      GROUP BY risk_level
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-risks', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.name, s.financial_health_score, s.risk_level, s.country,
        COALESCE((SELECT AVG(risk_score) FROM geopolitical_risks WHERE supplier_id = s.id), 0) as avg_geo_risk,
        COALESCE((SELECT AVG(overall_score) FROM esg_compliance WHERE supplier_id = s.id), 0) as avg_esg
      FROM suppliers s
      ORDER BY s.financial_health_score ASC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
