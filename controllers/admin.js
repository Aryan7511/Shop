const { Types } = require("mongoose");
const Product = require("../models/product");
const { validationResult } = require('express-validator');
const fileHelper = require('../util/file');
const product = require("../models/product");

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file; 
  const price = req.body.price;
  const description = req.body.description;

  if(!image){  //will check if image is set because if it's undefined, then that means that multer declined the incoming file.
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: "Attached file is not an image.",
      validationErrors: []
    });
  }

  const imageUrl = image.path;

  const errors = validationResult(req);

  if(!errors.isEmpty()){
    console.log(errors.array());

    /*when you set a status code, this does not mean that the app crashed or that the response is incomplete,
     it's simply an extra piece of information you pass to the browser. */
   return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }
  try {
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user._id, //or you can write session. only it will take _id automatically
  });

  
    await product.save();
    console.log("Created Product");
    res.redirect("/admin/products");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
    /*Well when we call next with an error passed as an argument, then we actually let express know that an error occurred 
    and it will skip all other middlewares and move right away to an error handling middleware*/
  }
};

exports.getEditProduct = async (req, res, next) => {
  //extracting from url query params like jo cheez ? iske baad start hoti hai e.g. localhost:3000/admin/edit-product?edit=true&title=new like this
  const editMode = req.query.edit;
  //note the extracted value always is a string so "true" instead of true
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;

  try {
    if (!Types.ObjectId.isValid(prodId)) {
      // Handle the case where prodId is not a valid ObjectId
      return res.redirect("/");
    }
    let product = await Product.findById(prodId);
    if (!product) { //if no such product exist in our database
      return res.redirect("/");
    }
    if(product.userId.toString() !== req.user._id.toString()){  //if wrong user is trying to see the edit product page of other product made by other user but it can't as we know that we authorised our post request
      return res.redirect('/');
    }
    res.render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: editMode,
      product: product,
      hasError: false,
      errorMessage: null,
      validationErrors: []
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const image = req.file;
  const updatedDesc = req.body.description;
  const updatedPrice = req.body.price;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  try {
    let product = await Product.findById(prodId);
    if(product.userId.toString() !== req.user._id.toString()){  //if wrong user is trying to edit the product somehow by manually writing in route
      return res.redirect('/');
    }
    product.title = updatedTitle;
    product.price = updatedPrice;
    if(image){  //if user select new image then we will update with new image file path
      fileHelper.deleteFile(product.imageUrl);
      product.imageUrl = image.path;
    }
    product.description = updatedDesc;

   await product.save();

    console.log("UPDATED PRODUCT!");
    res.redirect("/admin/products");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    // .select('title price -_id') //id will always be retrived unless you explicitly write -_id
    let products = await Product.find({userId: req.user._id}).populate("userId");

    // console.log(products);
    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products",
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
   const product = await Product.findById(prodId);
   if(!product){
    return next(new Error('Product not Found.'));
   }
  fileHelper.deleteFile(product.imageUrl);
  
  const userId = req.user._id.toString();
    const result =  await Product.deleteOne({_id: prodId, userId: userId});
    console.log("DESTRYOED PRODUCT");
    if (result.deletedCount === 0) {
      // Product not found or not authorized to delete
      console.log("Product not found or not authorized to delete");}
    res.status(200).json({message: 'Success!'});  //put simple javascript object inside json() funtion and then it will automatically converted into json format
  } catch (err) {
    console.log(err);
    res.status(500).json({message: 'Deleting product failed.'});
  }
};

