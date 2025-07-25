const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const { nanoid } = require("nanoid");

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract useful profile info
          const googleId = profile.id;
          const name = profile.displayName || "No Name";
          const email = profile.emails?.[0]?.value;
          const emailVerified = profile.emails?.[0]?.verified || false;
          const photo = profile.photos?.[0]?.value || null;

          if (!email) {
            // Reject if email not provided
            return done(new Error("Email not available from Google"), null);
          }

          // Check if user exists
          let user = await User.findOne({ googleId });

          if (!user) {
            // Generate a username from email or name
            let username = "";
            if (email) {
              username = email
                .split("@")[0]
                .replace(/[^a-zA-Z0-9]/g, "")
                .toLowerCase();
            }
            if ((!username || username.length < 3) && name) {
              username = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            }
            if (!username || username.length < 3) {
              username = `user${googleId.substring(0, 8)}`;
            }
            // Pad username if still too short
            if (username.length < 3) {
              username = username.padEnd(3, "0");
            }
            username = username.substring(0, 20);

            // Ensure username is unique
            let uniqueUsername = username;
            let counter = 1;
            while (await User.findOne({ username: uniqueUsername })) {
              uniqueUsername = `${username}${counter}`.substring(0, 20);
              counter++;
            }

            user = await User.create({
              googleId,
              name,
              email,
              emailVerified,
              avatar: photo,
              username: uniqueUsername,
              password: nanoid(16), // Set a random password for Google users
            });
          } else {
            // Optional: update existing user profile info
            let shouldUpdate = false;

            if (user.name !== name) {
              user.name = name;
              shouldUpdate = true;
            }
            if (user.email !== email) {
              user.email = email;
              shouldUpdate = true;
            }
            if (user.emailVerified !== emailVerified) {
              user.emailVerified = emailVerified;
              shouldUpdate = true;
            }
            if (user.photo !== photo) {
              user.photo = photo;
              shouldUpdate = true;
            }
            if (shouldUpdate) await user.save();
          }

          return done(null, user);
        } catch (err) {
          console.error("Error in GoogleStrategy:", err);
          return done(err, null);
        }
      }
    )
  );

  // Serialize only user ID to session cookie
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user by ID for each request
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};
