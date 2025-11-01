// server/src/routes/accounts.js
/**
 * Account routes
 * Handles connected Gmail account management
 */

const express = require('express');
const { Account } = require('../config/database');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

/**
 * Get all connected accounts
 * GET /api/accounts
 */
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.userId }).select(
      'email isPrimary syncStatus lastSyncAt createdAt'
    );

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * Get single account
 * GET /api/accounts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select('email isPrimary syncStatus lastSyncAt createdAt');

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * Disconnect account
 * DELETE /api/accounts/:id
 * Note: Cannot delete primary account
 */
router.delete('/:id', async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Prevent deletion of primary account
    if (account.isPrimary) {
      return res.status(400).json({ error: 'Cannot delete primary account' });
    }

    // Delete account
    await Account.deleteOne({ _id: req.params.id });

    // Delete emails associated with this account
    const { Email } = require('../config/database');
    await Email.deleteMany({ accountId: req.params.id });

    res.json({ message: 'Account disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

/**
 * Get account sync status
 * GET /api/accounts/:id/status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select('syncStatus lastSyncAt');

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({
      syncStatus: account.syncStatus,
      lastSyncAt: account.lastSyncAt,
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    res.status(500).json({ error: 'Failed to fetch account status' });
  }
});

module.exports = router;