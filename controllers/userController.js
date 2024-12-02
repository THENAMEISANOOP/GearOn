const User = require("../models/userModel"); 
const bcrypt = require("bcryptjs");
const userAuthenticated = require("../middleware/userauthmildware");



// userController.js
exports.loginGET = (req, res) => { 
  // Check if the user is already logged in (session exists)
  if (req.session.user) {
    // Redirect to the home page if logged in
    return res.redirect("/");
  }
  // Render the login page if the user is not logged in
  res.render("user/userLogin");
};


exports.loginPOST = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("user/userLogin", { error: "User not registered" });
    }

    if (user.status === "blocked") {
      return res.render("user/userLogin", { error: `${email} is blocked` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("user/userLogin", { error: "Invalid credentials" });
    }

    req.session.user = user;

    // Redirect to the home page after successful login
    res.redirect("/");
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
};





// -------------User Signup Page--------------------
const { OTP, saveOTP } = require("../models/otpModel");
const nodemailer = require("nodemailer");
const { generateOTP, sendOTPEmail } = require("../utils/sendOTPutil");
const crypto = require("crypto");


exports.signupGET = (req, res) => {
  res.render("user/userSignup");
};

const transporter = nodemailer.createTransport({
  service: 'Gmail',  
  auth: {
    user: process.env.EMAIL,  
    pass: process.env.PASSWORD,  
  },
});






// Generate and send OTP, save OTP to database
exports.signupPOST = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const otp = generateOTP();
    console.log("first generated otp is "+otp)
    await sendOTPEmail(email, otp);
    await saveOTP(email, otp);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// Verify OTP and save user data to database
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, fullName, password } = req.body;
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const newUser = new User({ fullName, email, password });
    await newUser.save();

    const user = await User.findOne({ email });
    req.session.user = user;
    await OTP.deleteOne({ email, otp });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({ message: "Email is not registered" });
    }

    const newOtp = generateOTP();
    console.log("resend OTP is " + newOtp)
    otpRecord.otp = newOtp;  
    otpRecord.createdAt = Date.now();  
    await otpRecord.save();

    await sendOTPEmail(email, newOtp);

    res.status(200).json({ message: "OTP resent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// -------------User Profile Page--------------------

exports.getProfilePage = async (req, res) => {
  try {
    // Ensure the user is authenticated
    if (!req.session.user) {
      return res.redirect("/user/login"); // Redirect to login if not logged in
    }

    // Fetch user details using the session's userId
    const user = await User.findById(req.session.user._id).select(
      "fullName email status"
    );

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Render the profile page with the user details
    res.render("user/profile", { user });
  } catch (err) {
    console.error("Error fetching profile page:", err);
    res.status(500).send("Server Error");
  }
};


exports.logoutPOST = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).send("Failed to logout. Please try again.");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error("Error in logoutPOST:", error);
    res.status(500).send("Server error during logout.");
  }
};


//////////////////////////////////////////////////////////////////////////////////////////


const Product = require("../models/productSchema");
const Variant = require("../models/variantSchema");
const mongoose = require("mongoose"); // Import mongoose

exports.home = async (req, res) => {
  try {
    
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          imageUrl: 1,
          variants: {
            $arrayElemAt: ["$variants", 0],
          },
        },
      },
    ]);

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      productName: product.productName,
      imageUrl:
        Array.isArray(product.imageUrl) && product.imageUrl.length > 0
          ? product.imageUrl[0]
          : "/images/default-product.jpg",
      price: product.variants?.price || null,
      discountPrice: product.variants?.discountPrice || null,
    }));

    // console.log(formattedProducts);
    res.render("user/home", { products: formattedProducts });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).send("Server Error");
  }
};

exports.shopAll = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $unwind: {
          path: "$variants",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          imageUrl: 1,
          "variants.color": 1,
          "variants.price": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
        },
      },
    ]);

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      productName: product.productName,
      imageUrl:
        Array.isArray(product.imageUrl) && product.imageUrl.length > 0
          ? product.imageUrl[0]
          : "/images/default-product.jpg",
      price: product.variants?.price || null,
      discountPrice: product.variants?.discountPrice || null,
      discountPercentage: product.variants?.discountPercentage || null,
    }));

    // console.log(formattedProducts);
    res.render("user/shopAll", { products: formattedProducts });
  } catch (err) {
    console.error("Error fetching products for Shop All page:", err.message);
    res.status(500).send("Server Error");
  }
};

exports.viewProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid Product ID");
    }

    const product = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(productId) } },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $project: {
          productName: 1,
          imageUrl: 1,
          model: 1,
          brand: 1,
          "variants.price": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          "variants.rating": 1,
          "variants.color": 1,
        },
      },
    ]);

    if (!product || product.length === 0) {
      return res.status(404).send("Product not found");
    }

    // Format product data
    const formattedProduct = {
      productName: product[0].productName,
      imageUrl: product[0].imageUrl,
      model: product[0].model,
      brand: product[0].brand,
      variants: product[0].variants.map((variant) => ({
        price: variant.price || "N/A",
        discountPrice: variant.discountPrice || "N/A",
        discountPercentage: variant.discountPercentage || "N/A",
        rating: variant.rating || "No rating",
        color: variant.color || "Unknown",
      })),
    };

    res.render("user/viewProduct", { product: formattedProduct });
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).send("Server Error");
  }
};

