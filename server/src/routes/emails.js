// server/src/routes/emails.js
/**
 * Email routes
 * Handles email fetching, searching, and management
 */

const express = require('express');
const { Email, Account, Category } = require('../config/database');
const { verifyJWT } = require('../middleware/auth');
const emailService = require('../services/email');
const unsubscribeService = require('../services/unsubscribe');

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

/**
 * Get emails in a category
 * GET /api/emails?categoryId=xxx&limit=50&page=0&search=query
 */
router.get('/', async (req, res) => {
  try {
    const { categoryId, limit = 50, page = 0, search } = req.query;
    const skip = parseInt(page) * parseInt(limit);

    let query = { userId: req.userId, isArchived: { $ne: true } };

    // Filter by category if provided
    if (categoryId && categoryId !== 'all') {
      if (categoryId === 'uncategorized') {
        query.categoryId = null;
      } else {
        query.categoryId = categoryId;
      }
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { aiSummary: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query
    const emails = await Email.find(query)
      .select('from subject aiSummary receivedAt isRead categoryId gmailId')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ receivedAt: -1 })
      .populate('categoryId', 'name color');

    const total = await Email.countDocuments(query);

    res.json({
      emails,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: skip + parseInt(limit) < total,
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * Get single email with full content
 * GET /api/emails/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const email = await emailService.getEmailById(req.userId, req.params.id);

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email);
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

/**
 * Sync new emails from Gmail
 * POST /api/emails/sync
 * Body: { accountId? }
 */
router.post('/sync', async (req, res) => {
  try {
    const { accountId } = req.body;

    let accountIds = [];

    if (accountId) {
      // Sync specific account
      accountIds = [accountId];
    } else {
      // Sync all accounts
      const accounts = await Account.find({ userId: req.userId });
      accountIds = accounts.map((a) => a._id.toString());
    }

    if (accountIds.length === 0) {
      return res.status(400).json({ error: 'No accounts to sync' });
    }

    // Process emails for each account
    const results = [];
    for (const accId of accountIds) {
      try {
        const processed = await emailService.processNewEmails(req.userId, accId);
        results.push({
          accountId: accId,
          processed: processed.length,
        });
      } catch (error) {
        console.error(`Error syncing account ${accId}:`, error);
        results.push({
          accountId: accId,
          error: error.message,
        });
      }
    }

    res.json({
      message: 'Sync completed',
      results,
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

/**
 * Stop email sync
 * POST /api/emails/stop-sync
 * Body: { accountId? }
 */
router.post('/stop-sync', async (req, res) => {
  try {
    const { accountId } = req.body;

    let accountIds = [];

    if (accountId) {
      // Stop specific account sync
      accountIds = [accountId];
    } else {
      // Stop all account syncs
      const accounts = await Account.find({ userId: req.userId, syncStatus: 'syncing' });
      accountIds = accounts.map((a) => a._id.toString());
    }

    if (accountIds.length === 0) {
      return res.status(400).json({ error: 'No syncing accounts found' });
    }

    // Request stop for each account
    for (const accId of accountIds) {
      emailService.requestStopSync(accId);
    }

    res.json({
      message: 'Stop sync requested',
      accountIds,
    });
  } catch (error) {
    console.error('Error stopping sync:', error);
    res.status(500).json({ error: 'Failed to stop sync' });
  }
});

/**
 * Delete multiple emails
 * DELETE /api/emails
 * Body: { emailIds: [array of email IDs] }
 */
router.delete('/', async (req, res) => {
  try {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds must be a non-empty array' });
    }

    const success = await emailService.deleteEmailsByIds(req.userId, emailIds);

    res.json({
      message: success ? 'Emails deleted successfully' : 'Failed to delete emails',
      success,
    });
  } catch (error) {
    console.error('Error deleting emails:', error);
    res.status(500).json({ error: 'Failed to delete emails' });
  }
});

/**
 * Archive multiple emails
 * POST /api/emails/archive
 * Body: { emailIds: [array of email IDs] }
 */
router.post('/archive', async (req, res) => {
  try {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds must be a non-empty array' });
    }

    const success = await emailService.archiveEmailsByIds(req.userId, emailIds);

    res.json({
      message: success ? 'Emails archived successfully' : 'Failed to archive emails',
      success,
    });
  } catch (error) {
    console.error('Error archiving emails:', error);
    res.status(500).json({ error: 'Failed to archive emails' });
  }
});

/**
 * Unsubscribe from multiple emails
 * POST /api/emails/unsubscribe
 * Body: { emailIds: [array of email IDs] }
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { emailIds } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds must be a non-empty array' });
    }

    // Verify all emails belong to user
    const emails = await Email.find({
      _id: { $in: emailIds },
      userId: req.userId,
    });

    if (emails.length !== emailIds.length) {
      return res.status(403).json({ error: 'Unauthorized access to some emails' });
    }

    // Perform unsubscribe
    const results = await unsubscribeService.unsubscribeFromEmails(emailIds);

    res.json(results);
  } catch (error) {
    console.error('Error unsubscribing from emails:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from emails' });
  }
});

/**
 * Recategorize emails
 * PUT /api/emails/recategorize
 * Body: { emailIds, categoryId }
 */
router.put('/recategorize', async (req, res) => {
  try {
    const { emailIds, categoryId } = req.body;

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds must be a non-empty array' });
    }

    // Get old categories
    const emails = await Email.find({
      _id: { $in: emailIds },
      userId: req.userId,
    });

    if (emails.length !== emailIds.length) {
      return res.status(403).json({ error: 'Unauthorized access to some emails' });
    }

    // Update categories
    await Email.updateMany(
      { _id: { $in: emailIds } },
      { categoryId: categoryId || null }
    );

    // Update category counts
    const oldCategories = new Set(
      emails.map((e) => e.categoryId?.toString()).filter(Boolean)
    );
    for (const oldCat of oldCategories) {
      await Category.findByIdAndUpdate(
        oldCat,
        { $inc: { emailCount: -1 } },
        { new: true }
      );
    }

    if (categoryId) {
      await Category.findByIdAndUpdate(
        categoryId,
        { $inc: { emailCount: 1 } },
        { new: true }
      );
    }

    res.json({ message: 'Emails recategorized successfully' });
  } catch (error) {
    console.error('Error recategorizing emails:', error);
    res.status(500).json({ error: 'Failed to recategorize emails' });
  }
});

module.exports = router;