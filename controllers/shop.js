const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const stripe = require('stripe')('sk_test_51NMaskSCTxnRE6R1gOlehN8x4Gpjuypfc4bmO59x0f16AafWXAIjx1eRHKJ5NoS1ELMAT2sW3v3eCQcLo7vrtg9X008ktomnsE');

const ITEMS_PER_PAGE = 3;

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;

    let totalItmes = await Product.find().countDocuments();

    let products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    console.log(products);
    res.render("shop/product-list", {
      prods: products,
      pageTitle: "Products",
      path: "/products",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItmes,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItmes / ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId; //here params.productId is that part which came from dynamic route part
  try {
    let product = await Product.findById(prodId);
    console.log(product);
    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    //The + before req.query.page is a unary plus operator, used to convert the value of req.query.page into a numeric value.
    //It converts the string value to a number.
    /*: The logical OR operator (||) is used to set a default value of 1 if req.query.page is falsy (e.g., undefined, null, empty string).
     This means that if the page parameter is not provided in the query string or is not a valid number, the value of page will be set to 1. */
    const page = +req.query.page || 1;

    let totalItmes = await Product.find().countDocuments();

    let products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);
    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalItmes,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalItmes / ITEMS_PER_PAGE),
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items;
    console.log(products);
    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: products,
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const product = await Product.findById(prodId);
    const result = await req.user.addToCart(product);
    console.log(result);
    res.redirect("/cart");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const result = await req.user.removeFromCart(prodId);
    console.log(result);
    res.redirect("/cart");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckout = async(req,res,next)=>{
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items;
    // console.log(products);
    let total =0;
    products.forEach(p =>{
      total+= p.quantity*p.productId.price;
    });

    const session =await stripe.checkout.sessions.create({

      payment_method_types: ["card"],
      mode: "payment",
      line_items: products.map((p) => {
        return {
          quantity: p.quantity,
          price_data: {
            currency: "usd",
            unit_amount: p.productId.price * 100,
            product_data: {
              name: p.productId.title,
              description: p.productId.description,
            },
          },
        };
      }),
      customer_email: req.user.email,
      success_url: req.protocol + '://' + req.get('host') +'/checkout/success' ,  //http://localhost:3000/checkout/success
       cancel_url: req.protocol + '://' + req.get('host') +'/checkout/cancel'
    });

    res.render("shop/checkout", {
      path: "/checkout",
      pageTitle: "Checkout",
      products: products,
      totalSum: total,
      sessionId: session.id
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id });
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "your Orders",
      orders: orders,
    });
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckoutSuccess = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items.map((i) => {
      return { quantity: i.quantity, product: { ...i.productId._doc } };
    });

    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user, //already the pick the id
      },
      products: products,
    });

    await order.save();
    await req.user.clearCart();
    res.redirect("/orders");
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = "invoice-" + orderId + ".pdf";
  const invoicePath = path.join("data", "invoices", invoiceName);
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new Error("No order found."));
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      //checking for valid user
      return next(new Error("Unauthorized"));
    }

    /*this is actually streamed data created with that create read stream thing which is the recommended way of getting your
    file data especially for bigger files. */
    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    //if use attachment in the place of inline then it will download the file
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text("Invoice", {
      underline: true,
      align: "center",
    });
    pdfDoc.text("------------------------------------------------------");
    let totalPrice = 0;
    order.products.forEach((prod) => {
      totalPrice += prod.quantity * prod.product.price;
      pdfDoc
        .fontSize(14)
        .text(
          prod.product.title +
            " - " +
            prod.quantity +
            " x " +
            "$" +
            prod.product.price
        );
    });
    pdfDoc.text("------------------------------------------------------");
    pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);
    pdfDoc.end();
  } catch (err) {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
