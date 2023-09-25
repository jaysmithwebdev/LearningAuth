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
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook").Strategy;

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
  `mongodb+srv://admin-jay:${process.env.MONGO_ATLAS_PASSWORD}@cluster0.mhhfphq.mongodb.net/userDB`,
  {
    useNewUrlParser: true,
  }
);

// level 2 & 5 - mongoose schema allows us to add funtionality
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

// level 5 - add passport plugin to mongoose schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// level 5
passport.use(User.createStrategy()); // local log in strategy
passport.serializeUser(function (user, done) {
  done(null, user.id);
}); // create cookies
// passport.deserializeUser(function (id, done) {
//   User.findById(id, function (err, user) {
//     done(err, user);
//   }); //THIS IS THE BIT THAT BREAKS IT ALL!!!!
// }); // read cookies
// passport docs updated - new deserializeuser example:
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

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

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      //console.log(profile); // gets display name and an id number only
      User.findOrCreate(
        {
          facebookId: profile.id,
        },
        function (err, user) {
          return cb(err, user);
        }
      );
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
  "/auth/facebook",

  passport.authenticate("facebook")
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/secrets");
  }
);

app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
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

app.get("/secrets", async function (req, res) {
  const foundUsers = await User.find({ secret: { $ne: null } }).exec();
  // $ne: is a way of doing != inside these condition objects
  // mongoose.find() needs .exec() to return the data
  if (foundUsers) {
    res.render("secrets", { usersWithSecrets: foundUsers });
  } else {
    res.redirect("/");
  }
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async function (req, res) {
  //console.log(req.user); //req.user gives the mongo id
  const submittedSecret = req.body.secret;
  const currentUser = await User.findById(req.user);
  if (currentUser) {
    currentUser.secret = submittedSecret;
    await currentUser.save();
    res.redirect("/secrets");
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
