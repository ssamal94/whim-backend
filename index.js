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
import { ObjectId } from "mongodb";

dotenv.config();

let resetSecret;

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));
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
            logger.error(error);
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
        authorName: user.name,
        authorImage: user.profilePic,
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

//Fetch all posts
app.get("/getAllPosts", async (req, res) => {
  let results = [];
  results = await Product.find();
  if (results) {
    res.send({ message: "ok", results: results });
  } else {
    res.send({ message: "Error in query." });
  }
});

//Fetch posts for a specific user
app.post("/getUserPosts", (req, res) => {
  let results = [];
  const { email } = req.body;

  User.findOne({ email: email }, async (err, user) => {
    if (user) {
      if (user.aboutAuthor !== "empty") {
        var o_id = new ObjectId(user._id);
        results = await Product.find();
        if (results) {
          res.send({
            message: "ok",
            results: results,
            aboutAuthor: user.aboutAuthor,
            isSubscribed: user.isSubscribed,
          });
        } else {
          res.send({ message: "You do not have any active post." });
        }
      } else {
        res.send({ message: "incomplete profile" });
      }
    } else {
      res.send({ message: "error fetching user" });
    }
  });
});

//Delete a post
app.post("/deletePost", (req, res) => {
  const { postId } = req.body;
  const o_id = new ObjectId(postId);
  Product.findOne({ _id: o_id }, async (err, product) => {
    if (product) {
      await Product.remove({ _id: o_id });
      res.send({ message: "ok" });
    } else {
      res.send({ message: err });
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
  const { email } = req.body;
  const user = User.findOne({ email: email }, async (err, user) => {
    if (user) {
      await User.updateOne({ email: email }, { isSubscribed: false });
      res.send({
        message: "user unsunscribed",
        status: "ok",
      });
    } else {
      res.send({ message: err });
    }
  });
});

//Save Author details
app.post("/saveAuthor", (req, res) => {
  const { profilePic, intro, description, email } = req.body;
  const user = User.findOne({ email: email }, async (err, user) => {
    if (user) {
      await User.updateOne(
        { email: email },
        { introAuthor: intro, aboutAuthor: description, profilePic: profilePic }
      );
      res.send({
        message: "user details updated",
        status: "ok",
      });
    } else {
      res.send({ message: err });
    }
  });
});

//Get author details
app.post("/getAuthor", (req, res) => {
  const { id } = req.body;
  var o_id = new ObjectId(id);
  const user = User.findOne({ _id: o_id }, (err, user) => {
    if (user) {
      res.send({
        intro: user.introAuthor,
        about: user.aboutAuthor,
        message: "ok",
      });
    } else res.send({ message: "User not found" });
  });
});

//START APP SERVER
app.listen(9032, () => {
  logger.info("Backend started at port 9032");
});
