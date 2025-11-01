// server/src/services/ai.js
/**
 * AI service for email classification and summarization
 * Uses Claude API to categorize emails and generate summaries
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Category } = require('../config/database');

try {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY is not set in environment variables');
  }
  
  const client = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
  
  console.log(process.env.CLAUDE_API_KEY);
  console.log('✅ Anthropic SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Anthropic SDK:', error.message);
  console.error('Make sure CLAUDE_API_KEY is set in .env file');
  client = null;
}

/**
 * Classify email into a category based on AI analysis
 * @param {string} userId - User ID for fetching their categories
 * @param {object} email - Email object with subject, body, from
 * @returns {Promise<object>} Classification result with categoryId and confidence
 */
async function classifyEmail(userId, email) {
  try {
    const client = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
      });
    // Check if client is initialized
    if (!client) {
      console.error('❌ Claude API client not initialized');
      return {
        categoryId: null,
        categoryName: 'Unclassified',
        confidence: 0,
        error: 'Claude API not configured',
      };
    }

    // Fetch user's categories
    const categories = await Category.find({ userId });

    if (categories.length === 0) {
      return {
        categoryId: null,
        categoryName: 'Unclassified',
        confidence: 0,
      };
    }

    // Build category descriptions for the prompt
    const categoryDescriptions = categories
      .map((cat) => `- ${cat.name}: ${cat.description}`)
      .join('\n');

    // Create classification prompt
    const prompt = `You are an email classification AI. Analyze the following email and classify it into ONE of the provided categories.

Email:
From: ${email.from}
Subject: ${email.subject}
Body (first 500 chars): ${email.body.substring(0, 500)}

Available Categories:
${categoryDescriptions}

Respond with a JSON object containing:
{
  "categoryName": "the exact category name this email belongs to",
  "confidence": 0.0 to 1.0 confidence score,
  "reasoning": "brief explanation of why you chose this category"
}

Only respond with valid JSON, no other text.`;


    // Call Claude API
    const message = await client.messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse response
    const responseText = message.content[0].text;
    const classification = JSON.parse(responseText);

    // Find category by name
    const selectedCategory = categories.find((cat) => cat.name === classification.categoryName);

    return {
      categoryId: selectedCategory?._id || null,
      categoryName: classification.categoryName,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    };
  } catch (error) {
    console.error('❌ Error classifying email:', error.message);
    // Return unclassified instead of throwing
    return {
      categoryId: null,
      categoryName: 'Unclassified',
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Generate AI summary of email content
 * @param {object} email - Email object with subject, body
 * @returns {Promise<string>} AI-generated summary
 */
async function summarizeEmail(email) {
  try {
    const prompt = `Summarize the following email in 1-2 sentences, capturing the main points:

Subject: ${email.subject}
Body: ${email.body}

Provide a concise summary suitable for quick scanning. Only return the summary text, no other content.`;
const client = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
  
    const message = await client.messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].text.trim();
  } catch (error) {
    console.error('Error summarizing email:', error);
    throw error;
  }
}

/**
 * Generate batch summaries for multiple emails
 * @param {Array<object>} emails - Array of email objects
 * @returns {Promise<Array<string>>} Array of summaries
 */
async function summarizeEmailBatch(emails) {
  try {
    // Create batch summary request
    const emailsList = emails
      .map(
        (email, idx) =>
          `Email ${idx + 1}:
Subject: ${email.subject}
Body: ${email.body.substring(0, 300)}`
      )
      .join('\n\n');

    const prompt = `Summarize each of the following emails in 1 sentence each:

${emailsList}

Respond with a numbered list of summaries, one per line (e.g., "1. Summary here\n2. Summary here")
Only return the numbered list, no other content.`;
const client = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
    const message = await client.messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse numbered list response
    const responseText = message.content[0].text;
    const summaries = responseText
      .split('\n')
      .filter((line) => line.match(/^\d+\./))
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());

    return summaries;
  } catch (error) {
    console.error('Error summarizing email batch:', error);
    throw error;
  }
}

/**
 * Analyze email for spam/phishing characteristics
 * @param {object} email - Email object
 * @returns {Promise<object>} Analysis result
 */
async function analyzeEmailSafety(email) {
  try {
    const prompt = `Analyze this email for spam and phishing indicators:

From: ${email.from}
Subject: ${email.subject}
Body (first 300 chars): ${email.body.substring(0, 300)}

Respond with JSON:
{
  "isSpam": true/false,
  "isPhishing": true/false,
  "riskLevel": "low" | "medium" | "high",
  "indicators": ["list", "of", "indicators"]
}

Only respond with valid JSON, no other text.`;
const client = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
    const message = await client.messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return JSON.parse(message.content[0].text);
  } catch (error) {
    console.error('Error analyzing email safety:', error);
    throw error;
  }
}

module.exports = {
  classifyEmail,
  summarizeEmail,
  summarizeEmailBatch,
  analyzeEmailSafety,
};