const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const crypto = require("crypto");
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

exports.getLogin = async (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
    },
    validationErrors: []
  });
};

exports.getSignup = async (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationErrors: []
  });
};

exports.postLogin = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  //gathering all error that will be thrown by the check wala middleware which we placed in route
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //it means send the common status code 422 for validation failed and then render the same page
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array()
    });
  }

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: 'Invalid email or password.',
        oldInput: {
          email: email,
          password: password,
        },
        validationErrors: []
      });
    }

    //now checking that the user entered correct password or not
    const doMatch = await bcrypt.compare(password, user.password); //it returns true if matched otherwise false
    if (doMatch) {
      req.session.isLoggedIn = true;
      req.session.user = user;
      return req.session.save((err) => {
        //this will ensure that u will be redirected only after session is created
        console.log(err);
        res.redirect("/");
      });
    }
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: 'Invalid email or password.',
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: []
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postSignup = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  //gathering all error that will be thrown by the check wala middleware which we placed in route
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //it means send the common status code 422 for validation failed and then render the same page
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array()
    });
  }

  try {
     

    //if no such user is in the database then newly creating it
    const user = new User({
      email: email,
      password: hashedPassword,
      cart: { items: [] },
    });

    await user.save();
    //sending email that user is successfully signed up to his email
    //this transporter.sendmail is a asynchoronous task you can use await if you want that's not a problem
    //but using await making it like to send email before redirect can make our application slow down so it's better not to wait for it
    transporter.sendMail({
      to: email,
      from: "comauro7511@gmail.com",
      subject: "Signup Succeeded!",
      html: "<h1>You Successfully signed up!</h1>",
    });
    return res.redirect("/login");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postLogout = async (req, res, next) => {
  //this function will run after session is destroyed
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = async (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = async (req, res, next) => {
  try {
    const randomBytes = crypto.randomBytes(32);
    const token = randomBytes.toString("hex");

    const email = req.body.email;
    const user = await User.findOne({ email: email });

    if (!user) {
      //if no user is registered for this email
      req.flash(
        "error" /*this is key */,
        "No account with that email found." /*this is message */
      );
      return res.redirect("/reset");
    }

    user.resetToken = token;
    user.resetTokenExpiration = Date.now() + 3600000; //3600000 it's in milli seconds represents 1hour
    await user.save();

    //now we will send token reset email to the user
    res.redirect("/");
    transporter.sendMail({
      to: email,
      from: "comauro7511@gmail.com",
      subject: "Password reset",
      /*backtick `` allows to write multiline in html field*/
      html: ` 
   <p>you requested a password reset</p>
   <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
   `,
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getNewPassword = async (req, res, next) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render("auth/new-password", {
      path: "/new-password",
      pageTitle: "New Password",
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token,
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postNewPassword = async (req, res, next) => {
  try {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    const user = await User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId,
    });

    //now encrypting passoword using bcrypt but it is asynchronous task

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;

    await user.save();
    res.redirect("/login");
    //now we will send email confirmation of password change  to the user
    transporter.sendMail({
      to: email,
      from: "comauro7511@gmail.com",
      subject: "Password reset succesfully!",
      /*backtick `` allows to write multiline in html field*/
      html: `<p>Your password is changed successfully!</p>`,
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
