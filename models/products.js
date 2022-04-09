import mongoose from "mongoose";

//Schema Creation
const productSchema = new mongoose.Schema({
  authorId: String,
  authorName: String,
  authorImage: String,
  category: String,
  coverImage: String,
  title: String,
  aboutCorse: String,
  preRequisite: String,
  videoLinks: Array,
});

//Model Creation
const Product = new mongoose.model("products", productSchema);

export { productSchema, Product };
