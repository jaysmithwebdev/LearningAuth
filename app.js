//jshint esversion:6
// level 3 - dotenv for environment vars - use at top of code
require("dotenv").config();
//
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// level2
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

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

// level 2 - mongoose schema allows us to add funtionality
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// plain text secret = level 2
// const secret = "Thisisalongstringthatishardtoguess.";
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });

// level 3 - access environment var
userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ["password"],
});

const User = new mongoose.model("User", userSchema);

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

// LEVEL 1, 2 AUTHENTICATION //////////////////////////////////////////////////////
app.post("/register", async function (req, res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });

  await newUser.save();

  res.render("secrets");
});

app.post("/login", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  const user = await User.findOne({ email: username });

  if (user) {
    if (user.password === password) {
      res.render("secrets");
    }
  }
});

// RUN SERVER //////////////////////////////////////////////////////////////////
app.listen(3000, function () {
  console.log("Server started on port 3000.");
});
