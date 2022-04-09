import mongoose from "mongoose";

//Schema Creation
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  aboutAuthor: String,
  introAuthor: String,
  isSubscribed: Boolean,
  profilePic: String,
  posts: Object,
});

//Model Creation
const User = new mongoose.model("User", userSchema);

export { userSchema, User };
