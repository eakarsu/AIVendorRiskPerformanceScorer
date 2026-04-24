const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get timeline for a specific supplier
router.get('/supplier/:supplierId', authMiddleware, async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    const events = [];

    // Delivery events
    const deliveries = await pool.query(
      `SELECT id, order_id, promised_date, actual_date, on_time, quality_score, created_at
       FROM delivery_performance WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [supplierId]
    );
    deliveries.rows.forEach(d => {
      events.push({
        id: `delivery-${d.id}`,
        type: 'delivery',
        title: `Delivery ${d.order_id}`,
        description: d.on_time ? `Delivered on time with quality score ${d.quality_score}` : `Late delivery (promised: ${d.promised_date}, actual: ${d.actual_date})`,
        status: d.on_time ? 'success' : 'warning',
        date: d.created_at
      });
    });

    // Contract events
    const contracts = await pool.query(
      `SELECT id, contract_number, contract_type, start_date, end_date, value, status, created_at
       FROM vendor_contracts WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [supplierId]
    );
    contracts.rows.forEach(c => {
      events.push({
        id: `contract-${c.id}`,
        type: 'contract',
        title: `Contract ${c.contract_number}`,
        description: `${c.contract_type} contract - $${parseFloat(c.value).toLocaleString()} - Status: ${c.status}`,
        status: c.status === 'Active' ? 'success' : c.status === 'Expired' ? 'danger' : 'info',
        date: c.created_at
      });
    });

    // Risk alert events
    const alerts = await pool.query(
      `SELECT id, title, severity, status, description, created_at
       FROM risk_alerts WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [supplierId]
    );
    alerts.rows.forEach(a => {
      events.push({
        id: `alert-${a.id}`,
        type: 'alert',
        title: a.title,
        description: a.description,
        status: a.severity === 'Critical' ? 'danger' : a.severity === 'High' ? 'warning' : 'info',
        date: a.created_at
      });
    });

    // ESG events
    const esg = await pool.query(
      `SELECT id, overall_score, compliance_status, created_at
       FROM esg_compliance WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [supplierId]
    );
    esg.rows.forEach(e => {
      events.push({
        id: `esg-${e.id}`,
        type: 'esg',
        title: `ESG Assessment`,
        description: `Overall score: ${e.overall_score} - Status: ${e.compliance_status}`,
        status: parseFloat(e.overall_score) >= 70 ? 'success' : parseFloat(e.overall_score) >= 50 ? 'warning' : 'danger',
        date: e.created_at
      });
    });

    // Geopolitical events
    const geo = await pool.query(
      `SELECT id, country, risk_score, political_stability, sanctions_status, created_at
       FROM geopolitical_risks WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [supplierId]
    );
    geo.rows.forEach(g => {
      events.push({
        id: `geo-${g.id}`,
        type: 'geopolitical',
        title: `Geopolitical Risk - ${g.country}`,
        description: `Risk score: ${g.risk_score} - Stability: ${g.political_stability} - Sanctions: ${g.sanctions_status}`,
        status: parseFloat(g.risk_score) >= 70 ? 'danger' : parseFloat(g.risk_score) >= 40 ? 'warning' : 'success',
        date: g.created_at
      });
    });

    // Document events
    const docs = await pool.query(
      `SELECT id, document_name, document_type, status, expiry_date, created_at
       FROM compliance_documents WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [supplierId]
    );
    docs.rows.forEach(d => {
      events.push({
        id: `doc-${d.id}`,
        type: 'document',
        title: d.document_name,
        description: `${d.document_type} - Status: ${d.status} - Expires: ${d.expiry_date || 'N/A'}`,
        status: d.status === 'Valid' ? 'success' : d.status === 'Expired' ? 'danger' : 'warning',
        date: d.created_at
      });
    });

    // Sort all events by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
