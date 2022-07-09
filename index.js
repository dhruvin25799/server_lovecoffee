const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helpers = require("./helpers");
const saltRounds = 10;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/lovecoffeeDB"
);
const User = require("./models/User");
const Product = require("./models/Product");
const JWT_SECRET_KEY = process.env.JWT_KEY || "somekeyhere";
app.listen(PORT, () => console.log(`Server listening on PORT ${PORT}`));

app.route("/products").get(async (req, res) => {
  try {
    const ProductList = await Product.find();
    res.status(200);
    res.json(ProductList);
  } catch (err) {
    res.status(500);
    res.send();
  }
});

app.route("/register").post(async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, saltRounds);
    const newUser = new User({
      email: req.body.email,
      password: hash,
      cart: {
        cart: [],
        totalAmount: "0",
        totalItems: "0",
        shippingCharges: "0",
      },
      wishlist: [],
      address: [],
    });
    await newUser.save();
    res.status(200);
    res.send(
      JSON.stringify({
        message: "Registartion successfull.",
      })
    );
  } catch (err) {
    if (err.message.split(" ")[0] === "E11000") {
      res.status(403);
      res.send(
        JSON.stringify({
          error: "Email already registered",
        })
      );
    } else {
      res.status(500);
      res.send();
    }
  }
});

app.route("/login").post(async (req, res) => {
  const userEmail = req.body.email;
  const userPassword = req.body.password;
  try {
    const foundUser = await User.findOne({ email: userEmail });
    const result = await bcrypt.compare(userPassword, foundUser.password);
    if (result === true) {
      //Improve logic here
      const data = { foundUser };
      const token = jwt.sign(data, JWT_SECRET_KEY, {
        expiresIn: "15m",
      });
      res.status(200);
      res.send(
        JSON.stringify({
          message: "User authenticated.",
          token,
        })
      );
    } else {
      res.status(403);
      res.send(
        JSON.stringify({
          error: "Invalid Password.",
        })
      );
    }
  } catch (err) {
    res.status(500);
    res.send();
  }
});

app.route("/user/wishlist").get(async (req, res) => {
  const token = req.headers["authorization"];
  try {
    const decoded = helpers.verifyToken(token);
    const userId = decoded.foundUser._id;
    const foundUser = await helpers.findUser(userId);
    res.status(200);
    res.send(JSON.stringify(foundUser.wishlist));
  } catch (err) {
    res.status(403);
    res.send(
      JSON.stringify({
        error: "Your token has expired or invalid. Please authenticate again.",
      })
    );
  }
});

app.route("/user/address").get(async (req, res) => {
  const token = req.headers["authorization"];
  try {
    const decoded = helpers.verifyToken(token);
    const userId = decoded.foundUser._id;
    const foundUser = await helpers.findUser(userId);
    res.status(200);
    res.send(JSON.stringify(foundUser.address));
  } catch (err) {
    res.status(403);
    res.send(
      JSON.stringify({
        error: "Your token has expired or invalid. Please authenticate again.",
      })
    );
  }
});

app
  .route("/user/wishlist/:productId")
  .post(async (req, res) => {
    const token = req.headers["authorization"];
    try {
      const decoded = helpers.verifyToken(token);
      const produtId = req.params.productId;
      const product = req.body.product;
      const userId = decoded.foundUser._id;
      const foundUser = await helpers.findUser(userId);
      foundUser.wishlist.push(product);
      await foundUser.save();
      res.status(200);
      res.send(JSON.stringify(foundUser.wishlist));
      await foundUser.save();
    } catch (err) {
      res.status(403);
      res.send(
        JSON.stringify({
          error:
            "Your token has expired or invalid. Please authenticate again.",
        })
      );
    }
  })
  .delete(async (req, res) => {
    const token = req.headers["authorization"];
    try {
      const decoded = helpers.verifyToken(token);
      const produtId = req.params.productId;
      const userId = decoded.foundUser._id;
      const foundUser = await helpers.findUser(userId);
      const newList = foundUser.wishlist.filter(
        (item) => item._id !== produtId
      );
      foundUser.wishlist = newList;
      await foundUser.save();
      res.status(200);
      res.send(JSON.stringify(foundUser.wishlist));
    } catch (err) {
      res.status(403);
      res.send(
        JSON.stringify({
          error:
            "Your token has expired or invalid. Please authenticate again.",
        })
      );
    }
  });

app.route("/user/cart").get(async (req, res) => {
  const token = req.headers["authorization"];
  try {
    const decoded = helpers.verifyToken(token);
    const userId = decoded.foundUser._id;
    const foundUser = await helpers.findUser(userId);
    res.status(200);
    res.send(JSON.stringify(foundUser.cart));
  } catch (err) {
    res.status(403);
    res.send(
      JSON.stringify({
        error: "Your token has expired or invalid. Please authenticate again.",
      })
    );
  }
});

app
  .route("/user/cart/:productId")
  .post(async (req, res) => {
    const token = req.headers["authorization"];
    try {
      const decoded = helpers.verifyToken(token);
      const type = req.body.type;
      const productId = req.params.productId;
      const product = req.body.product;
      const userId = decoded.foundUser._id;
      const foundUser = await helpers.findUser(userId);
      if (req.body.action) {
        const type = req.body.action;
        if (type === "increment") {
          foundUser.cart = {
            ...foundUser.cart,
            cart: foundUser.cart.cart.map((item) =>
              item._id === productId
                ? { ...item, quantity: +item.quantity + 1 }
                : item
            ),
            totalAmount:
              +foundUser.cart.totalAmount + helpers.calcPrice(product),
            totalItems: +foundUser.cart.totalItems + 1,
          };
        }
        if (type === "decrement") {
          const isSingle = foundUser.cart.cart.find(
            (item) => item._id === productId
          );
          if (isSingle.quantity === 1) {
            foundUser.cart = {
              ...foundUser.cart,
              cart: foundUser.cart.cart.filter(
                (item) => item._id !== productId
              ),
              totalAmount:
                +foundUser.cart.totalAmount - helpers.calcPrice(product),
              totalItems: +foundUser.cart.totalItems - 1,
              shippingCharges:
                foundUser.cart.cart.length === 1
                  ? foundUser.cart.cart[0].quantity === 1
                    ? "0"
                    : "499"
                  : "499",
            };
          } else {
            foundUser.cart = {
              ...foundUser.cart,
              cart: foundUser.cart.cart.map((item) =>
                item._id === productId
                  ? { ...item, quantity: item.quantity - 1 }
                  : item
              ),
              totalAmount:
                +foundUser.cart.totalAmount - helpers.calcPrice(product),
              totalItems: +foundUser.cart.totalItems - 1,
            };
          }
        }
      } else {
        foundUser.cart = {
          cart: [...foundUser.cart.cart, { ...product, quantity: 1 }],
          totalAmount: +foundUser.cart.totalAmount + helpers.calcPrice(product),
          totalItems: +foundUser.cart.totalItems + 1,
          shippingCharges: "499",
        };
      }
      await foundUser.save();
      res.status(200);
      res.send(JSON.stringify(foundUser.cart));
    } catch (err) {
      res.status(403);
      res.send(
        JSON.stringify({
          error:
            "Your token has expired or invalid. Please authenticate again.",
        })
      );
    }
  })
  .delete(async (req, res) => {
    const token = req.headers["authorization"];
    try {
      const decoded = helpers.verifyToken(token);
      const produtId = req.params.productId;
      const product = req.body.product;
      const userId = decoded.foundUser._id;
      const foundUser = await helpers.findUser(userId);
      foundUser.cart = {
        cart: foundUser.cart.cart.filter((item) => item._id !== produtId),
        totalAmount:
          +foundUser.cart.totalAmount -
          helpers.calcPrice(product) * +product.quantity,
        totalItems: foundUser.cart.totalItems - product.quantity,
        shippingCharges:
          foundUser.cart.cart.length === 1
            ? "0"
            : foundUser.cart.shippingCharges,
      };
      await foundUser.save();
      res.status(200);
      res.send(JSON.stringify(foundUser.cart));
    } catch (err) {
      res.status(403);
      res.send(
        JSON.stringify({
          error:
            "Your token has expired or invalid. Please authenticate again.",
        })
      );
    }
  });

app.route("/user/cart/move/:productId").post(async (req, res) => {
  const token = req.headers["authorization"];
  try {
    const decoded = helpers.verifyToken(token);
    const productId = req.params.productId;
    const product = req.body.product;
    const action = req.body.action;
    const userId = decoded.foundUser._id;
    const foundUser = await helpers.findUser(userId);
    if (action === "WISHLIST_TO_CART") {
      foundUser.wishlist = foundUser.wishlist.filter(
        (item) => item._id !== productId
      );
      foundUser.cart = {
        ...foundUser.cart,
        cart: [...foundUser.cart.cart, { ...product, quantity: 1 }],
        totalAmount: +foundUser.cart.totalAmount + helpers.calcPrice(product),
        totalItems: foundUser.cart.totalItems + 1,
        shippingCharges:
          foundUser.cart.shippingCharges === "0"
            ? "499"
            : foundUser.cart.shippingCharges,
      };
    }
    if (action === "CART_TO_WISHLIST") {
      const { quantity: remove, ...rest } = product;
      foundUser.wishlist = [...foundUser.wishlist, rest];
      foundUser.cart = {
        ...foundUser.cart,
        cart: foundUser.cart.cart.filter((item) => item._id !== productId),
        totalAmount:
          +foundUser.cart.totalAmount -
          helpers.calcPrice(product) * +product.quantity,
        totalItems: +foundUser.cart.totalItems - product.quantity,
        shippingCharges:
          foundUser.cart.cart.length === 1
            ? "0"
            : foundUser.cart.shippingCharges,
      };
    }
    await foundUser.save();
    res.status(200);
    res.send(JSON.stringify(foundUser));
  } catch (err) {
    res.status(403);
    res.send(
      JSON.stringify({
        error: "Your token has expired or invalid. Please authenticate again.",
      })
    );
  }
});
