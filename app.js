if(process.env.NODE_ENV != "production"){
  require("dotenv").config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const session = require("express-session");
const connectMongoModule = require("connect-mongo");
const MongoStore = connectMongoModule.default || connectMongoModule;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const userRouter = require('./routes/user.js');

const atlasUri = process.env.ATLASDB_URL || "";
const localUri = "mongodb://127.0.0.1:27017/wanderlust";
const port = Number.parseInt(process.env.PORT, 10) || 8080;
const MONGO_URI =
  atlasUri.startsWith("mongodb://") || atlasUri.startsWith("mongodb+srv://")
    ? atlasUri
    : localUri;
const isProduction = process.env.NODE_ENV == "production";
const sessionSecret = process.env.SESSION_SECRET || process.env.SECRET || "dev-session-secret-change-me";

if (isProduction && sessionSecret === "dev-session-secret-change-me") {
  throw new Error("SESSION_SECRET (or SECRET) must be set in production.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

if (isProduction) {
  app.set("trust proxy", 1);
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later."
});

app.use(limiter);

const sanitizeObjectKeys = (payload) => {
  if (!payload || typeof payload !== "object") return;

  if (Array.isArray(payload)) {
    payload.forEach((item) => sanitizeObjectKeys(item));
    return;
  }

  Object.keys(payload).forEach((key) => {
    if (key.includes("$") || key.includes(".")) {
      delete payload[key];
      return;
    }

    sanitizeObjectKeys(payload[key]);
  });
};

app.use((req, res, next) => {
  sanitizeObjectKeys(req.body);
  sanitizeObjectKeys(req.params);
  next();
});

const scriptSrcUrls = [
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
  "https://unpkg.com"
];

const styleSrcUrls = [
  "https://cdn.jsdelivr.net",
  "https://fonts.googleapis.com",
  "https://cdnjs.cloudflare.com",
  "https://unpkg.com"
];

const connectSrcUrls = [
  "https://tile.openstreetmap.org"
];

const fontSrcUrls = [
  "https://fonts.gstatic.com",
  "https://cdnjs.cloudflare.com"
];

const imgSrcUrls = [
  "https://res.cloudinary.com",
  "https://images.unsplash.com",
  "https://plus.unsplash.com",
  "https://tile.openstreetmap.org"
];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...connectSrcUrls],
        scriptSrc: ["'self'", "'unsafe-inline'", ...scriptSrcUrls],
        styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
        workerSrc: ["'self'", "blob:"],
        imgSrc: ["'self'", "blob:", "data:", ...imgSrcUrls],
        fontSrc: ["'self'", ...fontSrcUrls],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

let store;
if (process.env.NODE_ENV === "test") {
  store = new session.MemoryStore();
} else {
  store = MongoStore.create({
    mongoUrl: MONGO_URI,
    crypto: {
      secret: sessionSecret,
    },
    touchAfter: 24 * 3600
  });

  store.on("error", (e) => {
    console.log("Session store error:", e);
  });
}

const sessionOptions = {
  store,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax"
  },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  res.locals.searchQuery = req.query?.search || req.query?.location || "";
  next();
});

// Home route — must be after session/flash/passport so flash and auth work
app.get("/", wrapAsync(async (req, res) => {
  const listings = await Listing.find({}).limit(6);
  res.render("home.ejs", { listings });
}));

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/privacy", (req, res) => {
  res.send("Privacy policy page coming soon.");
});

app.get("/terms", (req, res) => {
  res.send("Terms and conditions page coming soon.");
});

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  let { statusCode = 500, message = "Something went wrong" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

async function startServer() {
  try {
    if (MONGO_URI === localUri && atlasUri) {
      console.warn("Invalid ATLASDB_URL provided. Falling back to local MongoDB.");
    }

    if (process.env.NODE_ENV !== "test") {
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB");
    }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };