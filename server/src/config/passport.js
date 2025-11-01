// server/src/config/passport.js
/**
 * Passport.js configuration for Google OAuth 2.0
 * Handles authentication strategy and user serialization
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('./database');

/**
 * Configure Google OAuth strategy
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    /**
     * Verify callback - called when user authenticates
     * Creates or updates user in database
     */
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Look for existing user
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update existing user's tokens
          user.googleAccessToken = accessToken;
          if (refreshToken) {
            user.googleRefreshToken = refreshToken;
          }
          user.googleTokenExpiresAt = new Date(Date.now() + 3599 * 1000); // 1 hour
          user.updatedAt = new Date();
          await user.save();
        } else {
          // Create new user
          user = new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0]?.value,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleTokenExpiresAt: new Date(Date.now() + 3599 * 1000),
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

/**
 * Serialize user for session storage
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;