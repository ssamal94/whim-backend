import mongoose from "mongoose";

//Schema Creation
const productSchema = new mongoose.Schema({
  authorId: String,
  category: String,
  coverImage: Object,
  title: String,
  aboutCorse: String,
  preRequisite: String,
  videoLinks: Array,
});

//Model Creation
const Product = new mongoose.model("Product", productSchema);

export { productSchema, Product };
