const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const User = require("./models/user");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const MONGODB_URI =
  "mongodb+srv://Aryan:kLfKwx4A6MksgB5K@cluster0.mexrghk.mongodb.net/shop?retryWrites=true&w=majority";

const app = express();

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const csrfProtection = csrf();

/*The multer.diskStorage() function is used to configure the storage engine for handling file uploads. 
It accepts an object with two properties: destination and filename. */
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    //new Date().toISOString() returns a string representation of the current date and time in the ISO 8601 format.
    cb(null, Date.now() + '-' + file.originalname);
  }
});

/*The file filter function determines which files should be accepted or rejected during the file upload process. */
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.engine('handlebars',expressHbs()); //for setting this in which built engine is not associated eg handlebars

app.set("view engine", "ejs");
app.set("views", "views"); //where to find these dynamic templates

const adminRoutes = require("./routes/admin");

const shopRoutes = require("./routes/shop");

const authRoutes = require("./routes/auth");

const errorController = require("./controllers/error");



app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);


//public folder ke paas le jayega jaha bhi other files ko jaroorat hai
/*we can serve more than one folder statically and remember, statically serving a folder simply means
that requests to files in that folder will be handled automatically and the files will be returned,
so all the heavy lifting is done behind the scenes by express */
app.use(express.static(path.join(__dirname, "public")));
//we can simply adjust our middleware here and say if we have a request that goes to /images, 
//that starts with /images, then serve these files statically and now /images is the folder
app.use('/images',express.static(path.join(__dirname, "images"))); 

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection);
app.use(flash());



app.use((req,res,next)=>{
  //now for every request that is executed, these two fields will be set for the views that are rendered
   res.locals.isAuthenticated = req.session.isLoggedIn;
   res.locals.csrfToken = req.csrfToken();
   next();
});


// app.use((req,res,next)=>{
//     console.log("In the middleware!");
// next(); this Allows the request to continue to the next middleware in line (top to bottom)
//if you didn't call next() then request will die only here
//express doesn't send any default response
// });

app.use(async (req, res, next) => {
  if (!req.session.user) {
   return next();
  }
  try {
    const user = await User.findById(req.session.user._id);
    if(!user){
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
});


app.use("/admin", adminRoutes); //only route that starts with /admin will go to admin Routes file
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500',errorController.get500);

//using get post all it will do exact match rather than in use

//if you don't write '/' path or any path  it will be by default '/'
app.use(errorController.get404);

/*if you got more than one error-handling middleware , they will execute from top to bottom, just like normal middleware*/

app.use((error,req,res,next)=>{  //error handling middleware having 4 arguments and express can detect easily and move to this middleware right away
  // console.log(req.session.isLoggedIn);
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: !!req.session?.isLoggedIn
    /*req.session?.isLoggedIn Now if we try to access isLoggedIn on an undefined req.session we'll get undefined value instead of a type-error
    However, we can do better. !!req.session?.isLoggedIn By taking the inversion of the value, 
    and inverting it again, we can guarantee ourselves we have a false or true value for this key. */
  });
});

//connecting to database before listening to the server

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Database Connected Successfully");
    app.listen(3000, (err) => {
      if (err) {
        console.log("Error in server setup");
      } else {
        console.log("Server listening on Port 3000");
      }
    });
  } catch (err) {
    console.log(err);
  }
})();
