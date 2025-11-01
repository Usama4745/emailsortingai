// server/src/services/unsubscribe.js
/**
 * Unsubscribe service
 * Handles automated unsubscribe operations via HTTP links and email
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const nodemailer = require('nodemailer');
const { Email } = require('../config/database');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Attempt to unsubscribe from email via web link
 * Uses browser automation to navigate to unsubscribe URL and complete the process
 * @param {string} unsubscribeUrl - URL of the unsubscribe link
 * @param {string} emailId - Email ID for logging
 * @returns {Promise<boolean>} Success status
 */
async function unsubscribeViaWeb(unsubscribeUrl, emailId) {
  let browser = null;

  try {
    if (!unsubscribeUrl || !unsubscribeUrl.startsWith('http')) {
      console.log(`Invalid unsubscribe URL for email ${emailId}: ${unsubscribeUrl}`);
      return false;
    }

    console.log(`Attempting to unsubscribe from: ${unsubscribeUrl}`);

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Create new page
    const page = await browser.newPage();

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Navigate to unsubscribe URL
    await page.goto(unsubscribeUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Look for common unsubscribe button patterns and click them
    const unsubscribeSelectors = [
      'button:has-text("Unsubscribe")',
      'button:has-text("unsubscribe")',
      'input[type="button"][value*="nsubscribe"]',
      'a:has-text("Unsubscribe")',
      'a:has-text("unsubscribe")',
      '[role="button"]:has-text("Unsubscribe")',
      '.unsubscribe-btn',
      '.unsubscribe-button',
      '#unsubscribe',
    ];

    let clicked = false;

    for (const selector of unsubscribeSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          // Click the first unsubscribe element
          await elements[0].click();
          clicked = true;
          console.log(`Clicked unsubscribe button using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
        continue;
      }
    }

    // If we found and clicked a button, wait for confirmation
    if (clicked) {
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
      } catch (e) {
        // Page might not navigate, which is okay
      }

      console.log(`Successfully unsubscribed from email ${emailId}`);
      return true;
    }

    // If no button found, try clicking any form submit buttons
    const submitButtons = await page.$$('button[type="submit"], input[type="submit"]');
    if (submitButtons.length > 0) {
      await submitButtons[0].click();
      console.log(`Clicked submit button for email ${emailId}`);
      return true;
    }

    console.log(`Could not find unsubscribe button for email ${emailId}`);
    return false;
  } catch (error) {
    console.error(`Error unsubscribing from ${unsubscribeUrl}:`, error);
    return false;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
  }
}

/**
 * Unsubscribe via mailto link
 * Sends an email to the unsubscribe address
 * @param {string} emailAddress - Email address to send unsubscribe request to
 * @returns {Promise<boolean>} Success status
 */
async function unsubscribeViaEmail(emailAddress) {
  try {
    // Configure nodemailer (using Gmail for this example)
    // In production, use your own email service
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.UNSUBSCRIBE_EMAIL,
        pass: process.env.UNSUBSCRIBE_EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.UNSUBSCRIBE_EMAIL,
      to: emailAddress,
      subject: 'Unsubscribe',
      text: 'Please unsubscribe me from your mailing list.',
    });

    console.log(`Sent unsubscribe email to ${emailAddress}`);
    return true;
  } catch (error) {
    console.error(`Error sending unsubscribe email to ${emailAddress}:`, error);
    return false;
  }
}

/**
 * Attempt to unsubscribe from a list of emails
 * Tries web unsubscribe first, falls back to email unsubscribe
 * @param {Array<string>} emailIds - Array of email document IDs
 * @returns {Promise<object>} Results object with success/failure counts
 */
async function unsubscribeFromEmails(emailIds) {
  const results = {
    succeeded: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  try {
    // Get emails with unsubscribe information
    const emails = await Email.find({
      _id: { $in: emailIds },
    });

    for (const email of emails) {
      try {
        if (!email.unsubscribeUrl) {
          results.skipped++;
          results.details.push({
            emailId: email._id,
            status: 'skipped',
            reason: 'No unsubscribe link found',
          });
          continue;
        }

        let success = false;

        // Try web unsubscribe if URL is HTTP(S)
        if (email.unsubscribeUrl.startsWith('http')) {
          success = await unsubscribeViaWeb(email.unsubscribeUrl, email._id);
        }
        // Try email unsubscribe if URL is mailto
        else if (email.unsubscribeUrl.startsWith('mailto:')) {
          const emailAddr = email.unsubscribeUrl.replace('mailto:', '').split('?')[0];
          success = await unsubscribeViaEmail(emailAddr);
        }

        if (success) {
          results.succeeded++;
          results.details.push({
            emailId: email._id,
            status: 'success',
          });

          // Mark email as unsubscribe attempted
          await Email.findByIdAndUpdate(email._id, { unsubscribeAttempted: true });
        } else {
          results.failed++;
          results.details.push({
            emailId: email._id,
            status: 'failed',
            reason: 'Could not find unsubscribe button/link',
          });
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          emailId: email._id,
          status: 'error',
          reason: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing unsubscribe batch:', error);
    throw error;
  }
}

module.exports = {
  unsubscribeViaWeb,
  unsubscribeViaEmail,
  unsubscribeFromEmails,
};