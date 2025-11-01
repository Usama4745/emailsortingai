// server/src/services/gmail.js
/**
 * Gmail API integration service
 * Handles all Gmail API operations including fetching, archiving, and label management
 */

const { google } = require('googleapis');
const { Account, Email } = require('../config/database');

/**
 * Create Gmail client with user's OAuth token
 * Handles token refresh if needed
 * @param {string} accessToken - User's Google access token
 * @param {string} refreshToken - User's Google refresh token (optional)
 * @param {object} account - Account object for updating tokens
 * @returns {object} Gmail API client instance
 */
function createGmailClient(accessToken, refreshToken = null, account = null) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Listen for token refresh events
    auth.on('tokens', (tokens) => {
      if (tokens.refresh_token && account) {
        // Update refresh token in database if a new one is issued
        account.refreshToken = tokens.refresh_token;
        account.save().catch((err) => console.error('Error saving refresh token:', err));
      }
      if (tokens.access_token && account) {
        // Update access token
        account.accessToken = tokens.access_token;
        account.save().catch((err) => console.error('Error saving access token:', err));
      }
    });

    return google.gmail({ version: 'v1', auth });
  } catch (error) {
    console.error('❌ Error creating Gmail client:', error.message);
    throw error;
  }
}

/**
 * Fetch unread emails from Gmail inbox
 * @param {string} userId - User ID in database
 * @param {string} accountId - Account ID in database
 * @param {number} maxResults - Maximum emails to fetch
 * @returns {Promise<Array>} Array of email objects
 */
async function fetchUnreadEmails(userId, accountId, maxResults = 50) {
  try {
    // Get account with access token
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    console.log('📧 Fetching emails for account:', account.email);

    // Check if tokens exist
    if (!account.accessToken) {
      console.error('❌ No access token found - user needs to re-authorize Gmail');
      throw new Error('Access token missing - user needs to re-authorize');
    }

    // Create Gmail client with refresh token support (NOT async)
    const gmail = createGmailClient(
      account.accessToken,
      account.refreshToken,
      account
    );

    // Query for unread emails
    console.log('🔍 Querying for unread emails...');
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -label:archived',
      maxResults: maxResults,
    });

    // Verify response structure
    if (!response || !response.data) {
      console.log('⚠️  No response data from Gmail API');
      return [];
    }

    if (!response.data.messages || response.data.messages.length === 0) {
      console.log('✅ No unread emails found');
      return [];
    }

    console.log(`📨 Found ${response.data.messages.length} unread emails`);

    // Fetch full message details for each email
    const emails = await Promise.all(
      response.data.messages.map((msg) =>
        gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        })
      )
    );

    console.log(`✅ Fetched ${emails.length} email details`);
    return emails.map((email) => parseEmailMessage(email.data));
  } catch (error) {
    console.error('❌ Error fetching emails from Gmail:', error.message);
    
    // If it's an auth error, provide helpful message
    if (error.message.includes('Invalid Credentials')) {
      console.error('⚠️  Invalid credentials - user may need to re-authenticate');
      console.error('💡 Have user click "Re-authorize Gmail" to refresh tokens');
    }
    
    throw error;
  }
}

/**
 * Parse Gmail message object into standardized format
 * @param {object} message - Gmail API message object
 * @returns {object} Parsed email object
 */
function parseEmailMessage(message) {
  const headers = message.payload.headers;
  const getHeader = (name) => headers.find((h) => h.name === name)?.value || '';

  // Extract body content
  let body = '';
  if (message.payload.parts) {
    // Multipart message - get text/plain part
    const textPart = message.payload.parts.find((p) => p.mimeType === 'text/plain');
    if (textPart && textPart.body.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  } else if (message.payload.body && message.payload.body.data) {
    // Simple message
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  // Extract unsubscribe link from headers
  const listUnsubscribe = getHeader('List-Unsubscribe');
  const unsubscribeUrl = extractUnsubscribeUrl(listUnsubscribe);

  return {
    gmailId: message.id,
    gmailThreadId: message.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    snippet: message.snippet,
    body: body,
    receivedAt: new Date(parseInt(message.internalDate)),
    unsubscribeUrl: unsubscribeUrl,
    hasUnsubscribeLink: !!unsubscribeUrl,
  };
}

/**
 * Extract unsubscribe URL from List-Unsubscribe header
 * Format: <mailto:...>, <https://...>
 * @param {string} header - List-Unsubscribe header value
 * @returns {string|null} Unsubscribe URL or null
 */
function extractUnsubscribeUrl(header) {
  if (!header) return null;

  // Look for HTTP(S) URL
  const httpMatch = header.match(/<(https?:\/\/[^>]+)>/);
  if (httpMatch) {
    return httpMatch[1];
  }

  // Look for mailto
  const mailtoMatch = header.match(/<mailto:([^>]+)>/);
  if (mailtoMatch) {
    return `mailto:${mailtoMatch[1]}`;
  }

  return null;
}

/**
 * Archive email in Gmail (move to archive label)
 * @param {string} accountId - Account ID in database
 * @param {string} gmailId - Gmail message ID
 * @returns {Promise<boolean>} Success status
 */
async function archiveEmail(accountId, gmailId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const gmail = createGmailClient(account.accessToken);

    // Remove from inbox, add to archive (done by removing INBOX label)
    await gmail.users.messages.modify({
      userId: 'me',
      id: gmailId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    return true;
  } catch (error) {
    console.error('Error archiving email:', error);
    throw error;
  }
}

/**
 * Archive multiple emails
 * @param {string} accountId - Account ID in database
 * @param {Array<string>} gmailIds - Array of Gmail message IDs
 * @returns {Promise<boolean>} Success status
 */
async function archiveEmails(accountId, gmailIds) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const gmail = createGmailClient(account.accessToken);

    // Archive each email
    await Promise.all(
      gmailIds.map((gmailId) =>
        gmail.users.messages.modify({
          userId: 'me',
          id: gmailId,
          requestBody: {
            removeLabelIds: ['INBOX'],
          },
        })
      )
    );

    return true;
  } catch (error) {
    console.error('Error archiving emails:', error);
    throw error;
  }
}

/**
 * Delete email from Gmail
 * @param {string} accountId - Account ID in database
 * @param {string} gmailId - Gmail message ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteEmail(accountId, gmailId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const gmail = createGmailClient(account.accessToken);

    // Move to trash
    await gmail.users.messages.trash({
      userId: 'me',
      id: gmailId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting email:', error);
    throw error;
  }
}

/**
 * Delete multiple emails
 * @param {string} accountId - Account ID in database
 * @param {Array<string>} gmailIds - Array of Gmail message IDs
 * @returns {Promise<boolean>} Success status
 */
async function deleteEmails(accountId, gmailIds) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    const gmail = createGmailClient(account.accessToken);

    // Delete each email
    await Promise.all(
      gmailIds.map((gmailId) =>
        gmail.users.messages.trash({
          userId: 'me',
          id: gmailId,
        })
      )
    );

    return true;
  } catch (error) {
    console.error('Error deleting emails:', error);
    throw error;
  }
}

/**
 * Get user profile from Gmail
 * @param {string} accessToken - User's access token
 * @returns {Promise<object>} User profile object
 */
async function getUserProfile(accessToken) {
  try {
    const gmail = createGmailClient(accessToken);
    const response = await gmail.users.getProfile({
      userId: 'me',
    });
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

module.exports = {
  createGmailClient,
  fetchUnreadEmails,
  parseEmailMessage,
  extractUnsubscribeUrl,
  archiveEmail,
  archiveEmails,
  deleteEmail,
  deleteEmails,
  getUserProfile,
};