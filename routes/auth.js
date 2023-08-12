const express = require("express");
const { check, body } = require("express-validator");
const User = require("../models/user");

const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    check("email", "Please enter a valid email.")
    .isEmail()
    .normalizeEmail(),  //for removing spaces n all

    body("password", "Password has to be valid.").trim()
      .isLength({ min: 5 })
      .isAlphanumeric()
      , //for removing spaces that either in starting or ending 
  ],
  authController.postLogin
);

router.get("/signup", authController.getSignup);

router.post(
  //array of middleware functions
  "/signup",
  [
    check("email", "Please enter a valid email.")
      .isEmail()
      .custom(async (value, { req }) => {
        //value represents value of the field like here it is email cozz in check('email') email field is mentioned
        // checking whether that email is already in the database or not
        const userDoc = await User.findOne({ email: value });
        if (userDoc) {
          //if email is already in the database
          throw new Error("E-mail exists already.");
        }
        // return true; returning true represents no error found
      }).normalizeEmail(),

    body(
      "password",
      "please enter a password that only consists of numbers and letters and atleast of length 5 characters."
    ) /*if you don't want to write error message for every validator and want one message that for all validator you can write like this */
      .isLength({ min: 5 })
      .isAlphanumeric().trim(),
      
    body("confirmPassword").trim().custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords have to match!");
      }
      return true;
    }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
