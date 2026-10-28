const express = require('express');
const router = express.Router();
const { getDBStatus } = require('../config/db');

router.get('/status', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    success: true,
    data: {
      server: {
        status: 'online',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      database: dbStatus,
    },
  });
});

module.exports = router;
