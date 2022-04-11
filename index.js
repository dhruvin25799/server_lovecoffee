const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/lovecoffeeDB"
);

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  cart: Object,
  wishlist: Array,
});
const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  img: String,
  discount: String,
  price: String,
  inStock: Boolean,
  rating: String,
});
const Product = mongoose.model("Product", productSchema);
const User = mongoose.model("User", userSchema);
const JWT_SECRET_KEY = "somekeyhere";
/* const NuttyHazelnut = new Product({
  name: "Nutty Hazelnut",
  category: "Instant Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "10",
  price: "500",
  inStock: true,
  rating: "4.3",
});
const BerryBlast = new Product({
  name: "Berry Blast",
  category: "Instant Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "10",
  price: "500",
  inStock: true,
  rating: "3.3",
});
const ClassicGold = new Product({
  name: "Classic Gold",
  category: "Instant Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "0",
  price: "700",
  inStock: false,
  rating: "4.8",
});
const ClassicBrewGold = new Product({
  name: "Classic Brew Gold",
  category: "Ground Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "15",
  price: "1000",
  inStock: true,
  rating: "2.0",
});
const HazelnutDelight = new Product({
  name: "Hazelnut Delight",
  category: "Ground Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "5",
  price: "1200",
  inStock: false,
  rating: "4.9",
});
const VeryBerry = new Product({
  name: "Very Berry",
  category: "Ground Coffee",
  img: "/images/product_images/instant-coffee-product-card.webp",
  discount: "15",
  price: "1350",
  inStock: true,
  rating: "3.0",
});
NuttyHazelnut.save();
BerryBlast.save();
ClassicGold.save();
ClassicBrewGold.save();
HazelnutDelight.save();
VeryBerry.save(); */
app.listen(PORT, () => console.log(`Server listening on PORT ${PORT}`));

app.route("/products").get((req, res) => {
  Product.find((err, ProductList) => {
    if (err) {
      res.status(500);
      console.log("Here");
      res.send();
    } else {
      res.status(200);
      res.json(ProductList);
    }
  });
});

app.route("/register").post((req, res) => {
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    if (err) {
      res.status(500);
      res.send();
    } else {
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
      });
      newUser.save((err) => {
        if (err) {
          res.status(500);
          if (err.message.split(" ")[0] === "E11000") {
            res.status(403);
            res.send(
              JSON.stringify({
                error: "Email already registered",
              })
            );
          }
          res.send();
        } else {
          console.log("User register success!");
          res.status(200);
          res.send(
            JSON.stringify({
              message: "Registartion successfull",
            })
          );
        }
      });
    }
  });
});

app.route("/login").post((req, res) => {
  const userEmail = req.body.email;
  const userPassword = req.body.password;
  User.findOne({ email: userEmail }, (err, foundUser) => {
    if (err) {
      console.log(err);
      console.log("Somer error");
      res.status(500);
      res.send();
    } else {
      if (foundUser) {
        console.log("User found!");
        bcrypt.compare(
          userPassword,
          foundUser.password,
          function (err, result) {
            if (err) {
              console.log("Some error");
              console.log(err);
              res.status(500);
              res.send();
            } else {
              if (result === true) {
                //Improve logic here
                console.log("Password matched");
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
                console.log("Password invalid");
                res.status(403);
                res.send(
                  JSON.stringify({
                    error: "Invalid Password.",
                  })
                );
              }
            }
          }
        );
      } else {
        console.log("User not found");
        res.status(404);
        res.send(
          JSON.stringify({
            error: "User not found!",
          })
        );
      }
    }
  });
});

app.route("/user/cart").get((req, res) => {
  const token = req.headers["authorization"];
  jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
    if (err) {
      console.log(err);
      if (err.name === "TokenExpiredError") {
        res.status(401);
        res.send();
      } else {
        res.status(403);
        res.send();
      }
    } else {
      if (decoded) {
        const userId = decoded.foundUser._id;
        User.findOne({ _id: userId }, (err, foundUser) => {
          if (err) {
            res.status(500);
            res.send();
          } else {
            if (foundUser) {
              res.status(200);
              res.send(JSON.stringify(foundUser.cart));
            }
          }
        });
      } else {
        res.status(403);
        res.send(
          JSON.stringify({
            error: "Your token has expired. Please authenticate again.",
          })
        );
      }
    }
  });
});

app.route("/user/wishlist").get((req, res) => {
  const token = req.headers["authorization"];
  jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
    if (err) {
      console.log(err);
      if (err.name === "TokenExpiredError") {
        res.status(401);
        res.send();
      } else {
        res.status(403);
        res.send();
      }
    } else {
      if (decoded) {
        const userId = decoded.foundUser._id;
        User.findOne({ _id: userId }, (err, foundUser) => {
          if (err) {
            res.status(500);
            res.send();
          } else {
            if (foundUser) {
              res.status(200);
              res.send(JSON.stringify(foundUser.wishlist));
            }
          }
        });
      } else {
        res.status(403);
        res.send(
          JSON.stringify({
            error: "Your token has expired. Please authenticate again.",
          })
        );
      }
    }
  });
});

app
  .route("/user/wishlist/:productId")
  .post((req, res) => {
    const token = req.headers["authorization"];
    jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          res.status(401);
          res.send();
        } else {
          res.status(403);
          res.send();
        }
      } else {
        if (decoded) {
          const produtId = req.params.productId;
          const product = req.body.product;
          const userId = decoded.foundUser._id;
          User.findOne({ _id: userId }, (err, foundUser) => {
            if (err) {
              res.status(500);
              res.send();
            } else {
              if (foundUser) {
                foundUser.wishlist.push(product);
                foundUser.save((err) => {
                  if (err) {
                    res.status(500);
                    res.send();
                  } else {
                    res.status(200);
                    res.send(JSON.stringify(foundUser.wishlist));
                  }
                });
              }
            }
          });
        } else {
          res.status(403);
          res.send(
            JSON.stringify({
              error: "Your token has expired. Please authenticate again.",
            })
          );
        }
      }
    });
  })
  .delete((req, res) => {
    const token = req.headers["authorization"];
    jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          res.status(401);
          res.send();
        } else {
          res.status(403);
          res.send();
        }
      } else {
        if (decoded) {
          const produtId = req.params.productId;
          const product = req.body.product;
          const userId = decoded.foundUser._id;
          User.findOne({ _id: userId }, (err, foundUser) => {
            if (err) {
              res.status(500);
              res.send();
            } else {
              if (foundUser) {
                const newList = foundUser.wishlist.filter(
                  (item) => item._id !== produtId
                );
                foundUser.wishlist = newList;
                foundUser.save((err) => {
                  if (err) {
                    res.status(500);
                    res.send();
                  } else {
                    res.status(200);
                    res.send(JSON.stringify(foundUser.wishlist));
                  }
                });
              }
            }
          });
        } else {
          res.status(403);
          res.send(
            JSON.stringify({
              error: "Your token has expired. Please authenticate again.",
            })
          );
        }
      }
    });
  });

app.route("/user/cart").get((req, res) => {
  const token = req.headers["authorization"];
  jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
    if (err) {
      console.log(err);
      if (err.name === "TokenExpiredError") {
        res.status(401);
        res.send();
      } else {
        res.status(403);
        res.send();
      }
    } else {
      if (decoded) {
        const userId = decoded.foundUser._id;
        User.findOne({ _id: userId }, (err, foundUser) => {
          if (err) {
            res.status(500);
            res.send();
          } else {
            if (foundUser) {
              res.status(200);
              res.send(JSON.stringify(foundUser.cart));
            }
          }
        });
      } else {
        res.status(403);
        res.send(
          JSON.stringify({
            error: "Your token has expired. Please authenticate again.",
          })
        );
      }
    }
  });
});

app
  .route("/user/cart/:productId")
  .post((req, res) => {
    const token = req.headers["authorization"];
    const type = req.body.type;
    jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          res.status(401);
          res.send();
        } else {
          res.status(403);
          res.send();
        }
      } else {
        if (decoded) {
          const productId = req.params.productId;
          const product = req.body.product;
          const userId = decoded.foundUser._id;
          User.findOne({ _id: userId }, (err, foundUser) => {
            if (err) {
              res.status(500);
              res.send();
            } else {
              if (foundUser) {
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
                        +foundUser.cart.totalAmount +
                        (+product.price -
                          +product.price * (+product.discount / 100)),
                      totalItems: +foundUser.cart.totalItems + 1,
                    };
                  }
                  if (type === "decrement") {
                    const isSingle = foundUser.cart.cart.find(
                      (item) => item._id === productId
                    );
                    console.log(isSingle);
                    if (isSingle.quantity === 1) {
                      foundUser.cart = {
                        ...foundUser.cart,
                        cart: foundUser.cart.cart.filter(
                          (item) => item._id !== productId
                        ),
                        totalAmount:
                          +foundUser.cart.totalAmount -
                          (+product.price -
                            +product.price * (+product.discount / 100)),
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
                          +foundUser.cart.totalAmount -
                          (+product.price -
                            +product.price * (+product.discount / 100)),
                        totalItems: +foundUser.cart.totalItems - 1,
                      };
                    }
                  }
                } else {
                  foundUser.cart = {
                    cart: [...foundUser.cart.cart, { ...product, quantity: 1 }],
                    totalAmount:
                      +foundUser.cart.totalAmount +
                      (+product.price -
                        +product.price * (+product.discount / 100)),
                    totalItems: +foundUser.cart.totalItems + 1,
                    shippingCharges: "499",
                  };
                }
                foundUser.save((err) => {
                  if (err) {
                    res.status(500);
                    res.send();
                  } else {
                    res.status(200);
                    res.send(JSON.stringify(foundUser.cart));
                  }
                });
              }
            }
          });
        } else {
          res.status(403);
          res.send(
            JSON.stringify({
              error: "Your token has expired. Please authenticate again.",
            })
          );
        }
      }
    });
  })
  .delete((req, res) => {
    const token = req.headers["authorization"];
    jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
      if (err) {
        console.log(err);
        if (err.name === "TokenExpiredError") {
          res.status(401);
          res.send();
        } else {
          res.status(403);
          res.send();
        }
      } else {
        if (decoded) {
          const produtId = req.params.productId;
          const product = req.body.product;
          const userId = decoded.foundUser._id;
          User.findOne({ _id: userId }, (err, foundUser) => {
            if (err) {
              res.status(500);
              res.send();
            } else {
              if (foundUser) {
                foundUser.cart = {
                  cart: foundUser.cart.cart.filter(
                    (item) => item._id !== produtId
                  ),
                  totalAmount:
                    +foundUser.cart.totalAmount -
                    (+product.price -
                      +product.price * (+product.discount / 100)) *
                      +product.quantity,
                  totalItems: foundUser.cart.totalItems - product.quantity,
                  shippingCharges:
                    foundUser.cart.cart.length === 1
                      ? "0"
                      : foundUser.cart.shippingCharges,
                };
                foundUser.save((err) => {
                  if (err) {
                    res.status(500);
                    res.send();
                  } else {
                    res.status(200);
                    res.send(JSON.stringify(foundUser.cart));
                  }
                });
              }
            }
          });
        } else {
          res.status(403);
          res.send(
            JSON.stringify({
              error: "Your token has expired. Please authenticate again.",
            })
          );
        }
      }
    });
  });

app.route("/user/cart/move/:productId").post((req, res) => {
  const token = req.headers["authorization"];
  const productId = req.params.productId;
  const product = req.body.product;
  const action = req.body.action;
  jwt.verify(token, JWT_SECRET_KEY, function (err, decoded) {
    if (err) {
      console.log(err);
      if (err.name === "TokenExpiredError") {
        res.status(401);
        res.send();
      } else {
        res.status(403);
        res.send();
      }
    } else {
      if (decoded) {
        const userId = decoded.foundUser._id;
        User.findOne({ _id: userId }, (err, foundUser) => {
          if (err) {
            res.status(500);
            res.send();
          } else {
            if (foundUser) {
              if (action === "WISHLIST_TO_CART") {
                foundUser.wishlist = foundUser.wishlist.filter(
                  (item) => item._id !== productId
                );
                foundUser.cart = {
                  ...foundUser.cart,
                  cart: [...foundUser.cart.cart, { ...product, quantity: 1 }],
                  totalAmount:
                    +foundUser.cart.totalAmount +
                    (+product.price -
                      +product.price * (+product.discount / 100)),
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
                  cart: foundUser.cart.cart.filter(
                    (item) => item._id !== productId
                  ),
                  totalAmount:
                    +foundUser.cart.totalAmount -
                    (+product.price -
                      +product.price * (+product.discount / 100)) *
                      product.quantity,
                  totalItems: +foundUser.cart.totalItems - product.quantity,
                  shippingCharges:
                    foundUser.cart.cart.length === 1
                      ? "0"
                      : foundUser.cart.shippingCharges,
                };
              }

              foundUser.save((err) => {
                if (err) {
                  res.status(500);
                  res.send();
                } else {
                  res.status(200);
                  res.send(JSON.stringify(foundUser));
                }
              });
            }
          }
        });
      } else {
        res.status(403);
        res.send(
          JSON.stringify({
            error: "Your token has expired. Please authenticate again.",
          })
        );
      }
    }
  });
});
