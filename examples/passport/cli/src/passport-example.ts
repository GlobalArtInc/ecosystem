import express from "express";
import passport from "passport";
import session from "express-session";
import { GlobalArtPassportStrategy } from "@globalart/passport";

const app = express();

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GlobalArtPassportStrategy(
    {
      clientId: process.env.CLIENT_ID!,
      clientSecret: process.env.CLIENT_SECRET!,
      redirectUri: process.env.REDIRECT_URI!,
      scope: ["openid", "profile", "email"],
    },
    (req, accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        accessToken,
        refreshToken,
      };
      return done(null, user);
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  done(null, { id });
});

app.get("/auth/globalart", passport.authenticate("globalart"));

app.get(
  "/auth/globalart/callback",
  passport.authenticate("globalart", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.redirect("/auth/globalart");
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
