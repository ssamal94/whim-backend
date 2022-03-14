import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import logger from "./logger.js";
import { userSchema, User } from "./models/user.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

//Database connection
mongoose.connect(
  "mongodb://localhost:27017/whim",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => {
    logger.info("Database conection successful");
    console.log("Database connection successful");
  }
);

//Routes-----------

//Login user
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email: email }, (err, user) => {
    if (user) {
      if (user.password === password) {
        res.send({ message: "User Logged In" });
      } else {
        res.send({ message: "Incorrect Password" });
      }
    } else {
      res.send("User not found");
    }
  });
});

//Register a new user
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email: email }, (err, user) => {
    if (user) {
      res.send({ message: "User already registered" });
    } else {
      const user = new User({
        name: name,
        email: email,
        password: password,
      });
      user.save((err) => {
        if (err) {
          res.send(err);
        } else res.send({ message: "User Added" });
      });
    }
  });
});

app.listen(9032, () => {
  logger.info("Backend started at port 9032");
});
