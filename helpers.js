const jwt = require("jsonwebtoken");
const User = require("./models/User");
const JWT_SECRET_KEY = process.env.JWT_KEY || "somekeyhere";

module.exports.calcPrice = (product) => {
  return +product.price - +product.price * (+product.discount / 100);
};

module.exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    return decoded;
  } catch (err) {
    throw new Error();
  }
};

module.exports.findUser = async (userId) => {
  try {
    const foundUser = await User.findOne({ _id: userId });
    return foundUser;
  } catch (err) {
      console.log(err);
    throw new Error(err);
  }
};
