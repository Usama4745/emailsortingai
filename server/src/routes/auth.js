// server/src/routes/auth.js
/**
 * Authentication routes
 * Handles OAuth login, logout, and token generation
 */

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { User, Account } = require('../config/database');
const { generateToken, verifyJWT } = require('../middleware/auth');
const gmailService = require('../services/gmail');

const router = express.Router();

/**
 * Initiate Google OAuth login
 * GET /api/auth/google
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    accessType: 'offline',
    prompt: 'consent', // Force consent screen to get refresh token
  })
);

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
  async (req, res) => {
    try {
      console.log('=== GOOGLE OAUTH CALLBACK ===');
      
      // User is authenticated by passport
      const user = req.user;
      console.log('✅ User authenticated:', user.email);

      // Generate JWT token
      const token = generateToken(user._id);
      console.log('🔐 Token generated:', token.substring(0, 20) + '...');

      // Create primary account for the user if it doesn't exist
      const existingAccount = await Account.findOne({
        userId: user._id,
        isPrimary: true,
      });
      console.log('📦 Existing account:', existingAccount ? 'YES' : 'NO');

      if (!existingAccount) {
        try {
          // Get Gmail profile for email address
          console.log('📧 Fetching Gmail profile...');
          const profile = await gmailService.getUserProfile(user.googleAccessToken);
          console.log('✅ Gmail profile fetched');

          const account = new Account({
            userId: user._id,
            email: user.email,
            accessToken: user.googleAccessToken,
            refreshToken: user.googleRefreshToken,
            tokenExpiresAt: user.googleTokenExpiresAt,
            isPrimary: true,
            syncStatus: 'pending',
          });

          await account.save();
          console.log('✅ Account created');
        } catch (profileError) {
          console.error('⚠️ Gmail profile error (non-fatal):', profileError.message);
          // Continue anyway - don't block the login
          console.log('⚠️ Continuing without Gmail profile...');
        }
      }

      // Redirect to frontend with token
      const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}&userId=${user._id}`;
      console.log('✅ OAuth callback successful');
      console.log('📧 User email:', user.email);
      console.log('📍 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ ERROR in OAuth callback:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.redirect(`${process.env.CLIENT_URL}/login`);
    }
  }
);

/**
 * Logout route
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }

      // Clear session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Session cleanup failed' });
        }

        res.json({ message: 'Logged out successfully' });
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Verify current session/token
 * GET /api/auth/verify
 */
router.get('/verify', async (req, res) => {
  try {
    // Check for JWT token
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        return res.json({
          authenticated: true,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      }
    }

    // Check for session
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        return res.json({
          authenticated: true,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      }
    }

    res.json({ authenticated: false });
  } catch (error) {
    console.error('Verify error:', error);
    res.json({ authenticated: false });
  }
});

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', verifyJWT, async (req, res) => {
  try {
    // Get user from request (set by auth middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;