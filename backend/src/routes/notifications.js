const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Get all notifications for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, s.name as supplier_name
      FROM notifications n
      LEFT JOIN suppliers s ON n.supplier_id = s.id
      WHERE n.user_id = $1 OR n.user_id IS NULL
      ORDER BY n.created_at DESC
      LIMIT 100
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unread count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND read = false`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read (must come before /:id routes)
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = true WHERE (user_id = $1 OR user_id IS NULL) AND read = false',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
