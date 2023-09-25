// app3 - adding Google OAuth
//jshint esversion:6
// level 3 - dotenv for environment vars - use at top of code
require("dotenv").config();
//
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// level 5 sessions, order of code v important here
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// passport-local does not need requiring (only npm i, putting in the package.json) - it is a dependency of passport-local-mongoose
// google oauth bits
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// use mongoose-findorcreate to enable the pseudo code to actually work
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// session goes here after the other use methods, before anything else happens
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize()); //method from passport, readies it for using it's auth
app.use(passport.session()); //use passport to handle the session

// SET UP DATABASE /////////////////////////////////////////////////////////////
mongoose.connect(
  "mongodb+srv://admin-jay:test123@cluster0.mhhfphq.mongodb.net/userDB",
  {
    useNewUrlParser: true,
  }
);

// level 2 & 5 - mongoose schema allows us to add funtionality
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  // add googleId field so findOrCreate method has something to search
  googleId: String,
});

// level 5 - add passport plugin to mongoose schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// level 5
passport.use(User.createStrategy()); // local log in strategy
// simple serialization only works for local, need more to work with all strategies
// passport.serializeUser(User.serializeUser()); // create cookies
// passport.deserializeUser(User.deserializeUser()); // read cookies
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id);
});

// google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

// ROUTES //////////////////////////////////////////////////////////////////////
app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  // Successful authentication, redirect home.
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/secrets", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
      res.redirect("/");
    }
  });
  res.redirect("/");
});

// LEVEL 1, 2 AUTHENTICATION ///////////////////////////////////////////////////
app.post("/register", async function (req, res) {
  // level 5 - sessions
  // .register is a passport-local-mongoose method
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", async function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  // passport log in method
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

// RUN SERVER //////////////////////////////////////////////////////////////////
app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
