const express = require("express");
const ProductList = require("./ProductList.js");
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.static("public"));



app.listen(PORT, () => console.log(`Server listening on PORT ${PORT}`));

app.route("/products").get((req, res) => {
  res.json(ProductList);
});


