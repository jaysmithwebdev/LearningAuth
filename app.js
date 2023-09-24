//jshint esversion:6
// level 3 - dotenv for environment vars - use at top of code
require("dotenv").config();
//
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// level2
// const encrypt = require("mongoose-encryption");
// level 3 - hashing - md5 is a hashing module
// const md5 = require("md5");
// level 4 - hashing and salting with bcrypt
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
// level 5 sessions, order of code v important here
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// passport-local does not need requiring (only npm i, putting in the package.json) - it is a dependency of passport-local-mongoose

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
    secret: "ThisIsALongStringThatWillGoInEnvirnmentVars",
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

// level 1 - basic js object
// const userSchema = {
//   email: String,
//   password: String,
// };

// level 2 & 5 - mongoose schema allows us to add funtionality
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// plain text secret = level 2
// const secret = "Thisisalongstringthatishardtoguess.";
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

// level 3 - access environment var
// userSchema.plugin(encrypt, {
//   secret: process.env.SECRET, // continues to work when environment vars are set for web host
//   encryptedFields: ["password"],
// });

// level 5 - add passport plugin to mongoose schema
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// level 5
passport.use(User.createStrategy()); // local log in strategy
passport.serializeUser(User.serializeUser()); // create cookies
passport.deserializeUser(User.deserializeUser()); // read cookies

// ROUTES //////////////////////////////////////////////////////////////////////
app.get("/", function (req, res) {
  res.render("home");
});

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

  // const newUser = new User({
  //   email: req.body.username,
  //   password: req.body.password,
  // });
  // level 4 hashing and salting
  // bcrypt.hash(req.body.password, saltRounds, async function (err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     //password: md5(req.body.password), //previous version before contained in bcrypt hashing
  //     password: hash,
  //   });
  //   await newUser.save();
  // });

  res.render("secrets");
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

  // const username = req.body.username;
  // // const password = md5(req.body.password); // hashing added
  // const password = req.body.password;

  // const user = await User.findOne({ email: username });

  // if (user) {
  //   //if (user.password === password) { //taken out after taking out md5
  //   // level 4 hashing and salting
  //   // bcrypt.compare(password, user.password, function (err, result) {
  //   //   if (result === true) {
  //   //     res.render("secrets");
  //   //   }
  //   // });
  // }
});

// RUN SERVER //////////////////////////////////////////////////////////////////
app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
