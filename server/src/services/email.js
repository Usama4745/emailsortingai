// server/src/services/email.js
/**
 * Email processing service
 * Orchestrates email fetching, classification, summarization, and archiving
 */

const { Email, Account, Category } = require('../config/database');
const gmailService = require('./gmail');
const aiService = require('./ai');

/**
 * Process and import new emails for a user account
 * Fetches unread emails from Gmail, classifies them, summarizes them, and archives them
 * @param {string} userId - User ID
 * @param {string} accountId - Account ID
 * @returns {Promise<Array>} Array of processed email objects
 */
async function processNewEmails(userId, accountId) {
  try {
    console.log(`Processing emails for user ${userId}, account ${accountId}`);

    // Update account sync status
    await Account.updateOne({ _id: accountId }, { syncStatus: 'syncing' });

    // Fetch unread emails from Gmail
    const gmailEmails = await gmailService.fetchUnreadEmails(userId, accountId);
    console.log(`Fetched ${gmailEmails.length} unread emails from Gmail`);

    if (gmailEmails.length === 0) {
      await Account.updateOne({ _id: accountId }, { syncStatus: 'completed', lastSyncAt: new Date() });
      return [];
    }

    // Process each email
    const processedEmails = [];
    for (const gmailEmail of gmailEmails) {
      try {
        // Check if email already exists
        const existingEmail = await Email.findOne({ gmailId: gmailEmail.gmailId });
        if (existingEmail) {
          console.log(`Email ${gmailEmail.gmailId} already exists, skipping`);
          continue;
        }

        // Classify email
        const classification = await aiService.classifyEmail(userId, gmailEmail);
        console.log(
          `Classified email "${gmailEmail.subject}" to category: ${classification.categoryName}`
        );

        // Summarize email
        const summary = await aiService.summarizeEmail(gmailEmail);
        console.log(`Summarized email "${gmailEmail.subject}"`);

        // Create email document
        const emailDoc = new Email({
          userId,
          accountId,
          categoryId: classification.categoryId,
          ...gmailEmail,
          aiSummary: summary,
          aiCategory: classification.categoryName,
          confidenceScore: classification.confidence,
        });

        await emailDoc.save();

        // Update category email count
        if (classification.categoryId) {
          await Category.findByIdAndUpdate(
            classification.categoryId,
            { $inc: { emailCount: 1 } },
            { new: true }
          );
        }

        // Archive email in Gmail
        await gmailService.archiveEmail(accountId, gmailEmail.gmailId);
        console.log(`Archived email ${gmailEmail.gmailId} in Gmail`);

        processedEmails.push(emailDoc);
      } catch (error) {
        console.error(`Error processing email ${gmailEmail.gmailId}:`, error);
        // Continue with next email even if one fails
        continue;
      }
    }

    // Update account sync status
    await Account.updateOne(
      { _id: accountId },
      { syncStatus: 'completed', lastSyncAt: new Date() }
    );

    console.log(`Processed ${processedEmails.length} emails successfully`);
    return processedEmails;
  } catch (error) {
    console.error('Error processing new emails:', error);
    await Account.updateOne({ _id: accountId }, { syncStatus: 'error' });
    throw error;
  }
}

/**
 * Get emails in a specific category with summaries
 * @param {string} userId - User ID
 * @param {string} categoryId - Category ID
 * @param {object} options - Query options (limit, skip, sort)
 * @returns {Promise<Array>} Array of email objects with summaries
 */
async function getEmailsByCategory(userId, categoryId, options = {}) {
  try {
    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    const emails = await Email.find({
      userId,
      categoryId,
    })
      .select('from subject aiSummary receivedAt isRead gmailId')
      .limit(limit)
      .skip(skip)
      .sort(sort);

    const total = await Email.countDocuments({
      userId,
      categoryId,
    });

    return {
      emails,
      total,
      hasMore: skip + limit < total,
    };
  } catch (error) {
    console.error('Error fetching emails by category:', error);
    throw error;
  }
}

/**
 * Get single email with full content
 * @param {string} userId - User ID
 * @param {string} emailId - Email document ID
 * @returns {Promise<object>} Full email object
 */
async function getEmailById(userId, emailId) {
  try {
    const email = await Email.findOne({
      _id: emailId,
      userId,
    });

    if (!email) {
      throw new Error('Email not found');
    }

    return email;
  } catch (error) {
    console.error('Error fetching email:', error);
    throw error;
  }
}

/**
 * Delete emails (move to trash in Gmail)
 * @param {string} userId - User ID
 * @param {Array<string>} emailIds - Array of email document IDs
 * @returns {Promise<boolean>} Success status
 */
async function deleteEmailsByIds(userId, emailIds) {
  try {
    // Get emails to find Gmail IDs and account ID
    const emails = await Email.find({
      _id: { $in: emailIds },
      userId,
    });

    if (emails.length === 0) {
      return false;
    }

    // Group by account for batch deletion
    const emailsByAccount = {};
    for (const email of emails) {
      if (!emailsByAccount[email.accountId]) {
        emailsByAccount[email.accountId] = [];
      }
      emailsByAccount[email.accountId].push(email.gmailId);
    }

    // Delete from Gmail for each account
    for (const [accountId, gmailIds] of Object.entries(emailsByAccount)) {
      await gmailService.deleteEmails(accountId, gmailIds);
    }

    // Delete from database
    const result = await Email.deleteMany({
      _id: { $in: emailIds },
      userId,
    });

    // Update category counts
    for (const email of emails) {
      if (email.categoryId) {
        await Category.findByIdAndUpdate(
          email.categoryId,
          { $inc: { emailCount: -1 } },
          { new: true }
        );
      }
    }

    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting emails:', error);
    throw error;
  }
}

/**
 * Move emails to archive (removes from inbox in Gmail)
 * @param {string} userId - User ID
 * @param {Array<string>} emailIds - Array of email document IDs
 * @returns {Promise<boolean>} Success status
 */
async function archiveEmailsByIds(userId, emailIds) {
  try {
    // Get emails to find Gmail IDs and account ID
    const emails = await Email.find({
      _id: { $in: emailIds },
      userId,
    });

    if (emails.length === 0) {
      return false;
    }

    // Group by account for batch archiving
    const emailsByAccount = {};
    for (const email of emails) {
      if (!emailsByAccount[email.accountId]) {
        emailsByAccount[email.accountId] = [];
      }
      emailsByAccount[email.accountId].push(email.gmailId);
    }

    // Archive in Gmail for each account
    for (const [accountId, gmailIds] of Object.entries(emailsByAccount)) {
      await gmailService.archiveEmails(accountId, gmailIds);
    }

    // Update in database
    const result = await Email.updateMany(
      {
        _id: { $in: emailIds },
        userId,
      },
      { isArchived: true }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error archiving emails:', error);
    throw error;
  }
}

/**
 * Search emails across all categories
 * @param {string} userId - User ID
 * @param {string} query - Search query (searches subject and summary)
 * @param {object} options - Query options
 * @returns {Promise<Array>} Matching emails
 */
async function searchEmails(userId, query, options = {}) {
  try {
    const { limit = 50, skip = 0 } = options;

    const emails = await Email.find(
      {
        userId,
        $or: [
          { subject: { $regex: query, $options: 'i' } },
          { aiSummary: { $regex: query, $options: 'i' } },
          { from: { $regex: query, $options: 'i' } },
        ],
      },
      'from subject aiSummary receivedAt categoryId'
    )
      .limit(limit)
      .skip(skip)
      .populate('categoryId', 'name color');

    const total = await Email.countDocuments({
      userId,
      $or: [
        { subject: { $regex: query, $options: 'i' } },
        { aiSummary: { $regex: query, $options: 'i' } },
        { from: { $regex: query, $options: 'i' } },
      ],
    });

    return {
      emails,
      total,
      hasMore: skip + limit < total,
    };
  } catch (error) {
    console.error('Error searching emails:', error);
    throw error;
  }
}

module.exports = {
  processNewEmails,
  getEmailsByCategory,
  getEmailById,
  deleteEmailsByIds,
  archiveEmailsByIds,
  searchEmails,
};