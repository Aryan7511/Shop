const express = require("express");
const path = require("path");

const router = express.Router();
const { check, body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

// const rootDir=require('../util/path');

// /admin/add-product => GET request
router.get("/add-product", isAuth, adminController.getAddProduct); //parsed from left to right

//their methods are different so these are two different routes
//same path can be used if method differs

// /admin/products => GET request
router.get("/products", isAuth, adminController.getProducts);

// // /admin/add-product => POST request
router.post(
  "/add-product",
[
    body('title')
    .isString()
    .isLength({ min: 3 })
    .trim(),
    
    body("price").isFloat(),

    body('description').isLength({ min: 5, max: 400 }).trim()
    
],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post("/edit-product",
[
    body("title")
    .isString()
    .isLength({ min: 3 })
    .trim(),
    
    body("price").isFloat(),

    body('description').isLength({ min: 5, max: 400 }).trim()
    
],
isAuth, adminController.postEditProduct);

router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
