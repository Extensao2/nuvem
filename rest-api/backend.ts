import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { MongoClient, Db, Collection } from "mongodb";
import MongoStore from "connect-mongo";

interface User {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
  lastLogin: Date;
}

interface LoginRecord {
  userId: string;
  email: string;
  loginTime: Date;
  ip: string;
  userAgent: string;
}

class AuthServer {
  private app: express.Application;
  private db: Db;
  private usersCollection: Collection<User>;
  private loginRecordsCollection: Collection<LoginRecord>;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupPassport();
    this.setupRoutes();
  }

  async connectToDatabase(mongoUrl: string) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    this.db = client.db("auth_app");
    this.usersCollection = this.db.collection<User>("users");
    this.loginRecordsCollection =
      this.db.collection<LoginRecord>("login_records");
  }

  private setupMiddleware() {
    this.app.use(express.json());
    this.app.use(
      session({
        secret: process.env.SESSION_SECRET || "your-secret-key",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          mongoUrl:
            process.env.MONGODB_URL || "mongodb://mongodb:27017/auth_app",
        }),
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
      }),
    );
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  private setupPassport() {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await this.usersCollection.findOne({
              googleId: profile.id,
            });

            if (user) {
              // Update last login
              await this.usersCollection.updateOne(
                { googleId: profile.id },
                { $set: { lastLogin: new Date() } },
              );
            } else {
              // Create new user
              const newUser: User = {
                googleId: profile.id,
                email: profile.emails?.[0]?.value || "",
                name: profile.displayName || "",
                picture: profile.photos?.[0]?.value,
                createdAt: new Date(),
                lastLogin: new Date(),
              };
              await this.usersCollection.insertOne(newUser);
              user = newUser;
            }

            return done(null, user);
          } catch (error) {
            return done(error, null);
          }
        },
      ),
    );

    passport.serializeUser((user: any, done) => {
      done(null, user.googleId);
    });

    passport.deserializeUser(async (googleId: string, done) => {
      try {
        const user = await this.usersCollection.findOne({ googleId });
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  private setupRoutes() {
    // Login route
    this.app.get(
      "/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] }),
    );

    // Callback route
    this.app.get(
      "/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login" }),
      async (req, res) => {
        // Record login
        const user = req.user as User;
        const loginRecord: LoginRecord = {
          userId: user.googleId,
          email: user.email,
          loginTime: new Date(),
          ip: req.ip || req.connection.remoteAddress || "",
          userAgent: req.get("User-Agent") || "",
        };

        await this.loginRecordsCollection.insertOne(loginRecord);

        res.redirect("/dashboard");
      },
    );

    // Logout route
    this.app.get("/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ error: "Logout failed" });
        }
        res.redirect("/");
      });
    });

    // Protected dashboard route
    this.app.get("/dashboard", this.isAuthenticated, (req, res) => {
      const user = req.user as User;
      res.json({
        message: "Welcome to dashboard",
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      });
    });

    // Login page
    this.app.get("/login", (req, res) => {
      res.send(`
        <h1>Login</h1>
        <a href="/auth/google">Login with Google</a>
      `);
    });

    // Home route
    this.app.get("/", (req, res) => {
      if (req.isAuthenticated()) {
        res.redirect("/dashboard");
      } else {
        res.send(`
          <h1>OAuth 2.0 Server</h1>
          <a href="/login">Login</a>
        `);
      }
    });

    // Get login history (protected route)
    this.app.get("/login-history", this.isAuthenticated, async (req, res) => {
      try {
        const user = req.user as User;
        const loginHistory = await this.loginRecordsCollection
          .find({ userId: user.googleId })
          .sort({ loginTime: -1 })
          .limit(10)
          .toArray();

        res.json(loginHistory);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch login history" });
      }
    });
  }

  private isAuthenticated(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/login");
  }

  async start(port: number = 3000) {
    await this.connectToDatabase(
      process.env.MONGODB_URL || "mongodb://mongodb:27017/auth_app",
    );

    this.app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  }
}

// Initialize and start server
const server = new AuthServer();
server.start().catch(console.error);
