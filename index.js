import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import logger from "./logger.js";
import { userSchema, User } from "./models/user.js";
import { productSchema, Product } from "./models/products.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

dotenv.config();

let resetSecret;

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

//Forgot password
app.post("/forgot_password", (req, res) => {
  const { email } = req.body;
  User.findOne({ email: email }, (err, user) => {
    //If user exists, create one time link valid for 5 minutes.
    if (user) {
      resetSecret = process.env.ACCESS_TOKEN_SECRET + user.password;
      const payload = {
        email: user.email,
        id: user.id,
      };
      const resetToken = jwt.sign(payload, resetSecret, { expiresIn: "5m" });
      //send email with reset link
      const link = `http://localhost:3000/reset_password/${user.email}/${resetToken}`;

      //---------------EMAIL LOGIC---------

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "whimsix6@gmail.com",
          pass: "Conestoga123@",
        },
      });

      var mailOptions = {
        from: "whimsix6@gmail.com",
        to: user.email,
        subject: "Password reset",
        html: `<div><h3> Please click on the below link to reset your password <h3> <div>
                <div> <a href="${link}" style="color:red">Reset Password</a>  <div/><br>
                <div> This link will expire in 5 minutes, if so, you may request for a new link. <div/>`,
      };

      try {
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
      } catch (error) {
        logger.info(error);
        res.send({ message: "Incorrect email" });
      }
      //-------------------------------------

      res.send({
        message: "Password reset email sent. Valid for only 5 minutes.",
      });
    } else {
      res.send({ message: "User does not exist" });
    }
  });
});

//Update password
app.post("/reset_password/:email/:resetToken", (req, res) => {
  const { email, resetToken } = req.params;
  try {
    const isTokenActive = jwt.verify(resetToken, resetSecret);
    const user = User.findOne({ email: email }, async (err, user) => {
      if (user) {
        const newuser = new User({
          name: user.name,
          email: email,
          password: req.body.password,
        });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        newuser.password = hashedPassword;
        await User.updateOne({ email: email }, { password: hashedPassword });
      } else {
        res.send({ message: err });
      }
    });
    res.send({
      message: "Password updated. Please login to continue",
      status: "ok",
    });
  } catch (error) {
    res.send({ message: "Session expired, please request for a new link." });
  }
});

//Login user
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({ email: email }, async (err, user) => {
    if (user) {
      //Check if username and pwd matches
      if (user && (await bcrypt.compare(password, user.password))) {
        //create token
        const accessToken = jwt.sign(
          { name: user.name, email: user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );

        //check if user has Author details
        let isAuthor = false;
        if (user.aboutAuthor !== "empty") {
          isAuthor = true;
        }

        //send status to frontend
        res.send({
          message: "User Logged In",
          token: accessToken,
          name: user.name,
          isAuthor: isAuthor,
          email: user.email,
          isSubscribed: user.isSubscribed,
        });
      } else {
        res.send({ message: "Incorrect Password" });
      }
    } else {
      res.send({ message: "User not found" });
    }
  });
});

//Register a new user
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  User.findOne({ email: email }, async (err, user) => {
    if (user) {
      res.send({ message: "User already registered" });
    } else {
      const user = new User({
        name: name,
        email: email,
        password: password,
        aboutAuthor: "empty",
        introAuthor: "empty",
        isSubscribed: false,
        profilePic: "",
        posts: { postIds: {} },
      });

      //Password hashing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      user.password = hashedPassword;

      user.save((err) => {
        if (err) {
          res.send(err);
        } else res.send({ message: "User Added" });
      });
    }
  });
});

//Add a new post
app.post("/addPost", (req, res) => {
  let isAuthor = "false";
  const {
    category,
    coverImage,
    title,
    aboutCorse,
    preRequisite,
    videoLinks,
    email,
  } = req.body;
  let authorId = "";
  User.findOne({ email: email }, async (err, user) => {
    if (user) {
      //save user id
      authorId = user._id;
      //check if user is author
      if (user.aboutAuthor !== "empty") {
        isAuthor = "true";
      }

      const product = new Product({
        authorId: authorId,
        category: category,
        coverImage: coverImage,
        title: title,
        aboutCorse: aboutCorse,
        preRequisite: preRequisite,
        videoLinks: videoLinks,
      });

      product.save((err) => {
        if (err) {
          res.send(err);
        } else res.send({ status: "ok", isAuthor: isAuthor });
      });
    } else {
      res.send({ message: "error finding user" });
    }
  });
});

//Delete a post
app.post("/deletePost", (req, res) => {
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

//Subscribe user
app.post("/subscribe", (req, res) => {
  const { email } = req.body;
  const user = User.findOne({ email: email }, async (err, user) => {
    if (user) {
      await User.updateOne({ email: email }, { isSubscribed: true });
      res.send({
        message: "user subscribed",
        status: "ok",
        isSubscribed: true,
      });
    } else {
      res.send({ message: err });
    }
  });
});

//Stop user subscription
app.post("/unsubscribe", (req, res) => {
  console.log(req.body);
  const { email } = req.body;
  const user = User.findOne({ email: email }, async (err, user) => {
    if (user) {
      await User.updateOne({ email: email }, { isSubscribed: false });
      res.send({
        message: "user subscribed",
        status: "ok",
        isSubscribed: false,
      });
    } else {
      res.send({ message: err });
    }
  });
});

app.listen(9032, () => {
  logger.info("Backend started at port 9032");
});
