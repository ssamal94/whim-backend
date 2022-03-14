import mongoose from "mongoose";

//Schema Creation
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
});

//Model Creation
const User = new mongoose.model("User", userSchema);

export { userSchema, User };
