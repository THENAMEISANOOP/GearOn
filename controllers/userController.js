const User = require("../models/userModel");
const Offer = require("../models/offerModel")
const bcrypt = require("bcryptjs");
const userAuthenticated = require("../middleware/userauthmiddleware");

// -------------User Login Page--------------------
exports.loginGET = (req, res) => {
  if (req.session.user) {
    return res.redirect("/user/profile");
  }
  res.render("user/userlogin");
};

exports.loginPOST = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("user/userlogin", {
        error: "User not registered",
        email,
      });
    }

    if (user.status === "blocked") {
      return res.render("user/userlogin", {
        error: `${email} is blocked`,
        email,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("user/userlogin", {
        error: "Wrong Email or Password",
        email,
      });
    }

    req.session.user = user;

    res.redirect("/user/profile");
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
  service: "Gmail",
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
    console.log("first generated otp is " + otp);
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
    console.log("resend OTP is " + newOtp);
    otpRecord.otp = newOtp;
    otpRecord.createdAt = Date.now();
    await otpRecord.save();

    await sendOTPEmail(email, newOtp);

    res.status(200).json({ message: "OTP resent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
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
        $unwind: {
          path: "$variants",
          preserveNullAndEmptyArrays: true, // Keeps products even if there are no variants
        },
      },
      {
        $project: {
          _id: 1,
          brand: 1,
          productName: 1,
          imageUrl: 1,
          "variants._id": 1,
          "variants.color": 1,
          "variants.price": 1,
          "variants.rating": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          "variants.stock": 1,
        },
      },
    ]);

    // Debugging: Print the products array
    products.forEach((product) => {
      console.log("Product:", product);
    });

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      brand: product.brand,
      productName: product.productName,
      imageUrl:
        Array.isArray(product.imageUrl) && product.imageUrl.length > 0
          ? product.imageUrl[0]
          : "/images/default-product.jpg",
      variants_id: product.variants?._id,
      color: product.variants?.color,
      price: product.variants?.price || null,
      rating: product.variants?.rating || null,
      discountPrice: product.variants?.discountPrice || null,
      discountPercentage: product.variants?.discountPercentage || null,
      stock: product.variants?.stock || "Out of Stock", // Safely access stock
    }));

    res.render("user/home", { products: formattedProducts });
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
    
    const offers = await Offer.find({ isActive: true });
    // Fetch product with its variants
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
          _id: 1,
          productName: 1,
          imageUrl: 1,
          model: 1,
          brand: 1,
          categoriesId: 1,
          "variants._id": 1,
          "variants.price": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          "variants.rating": 1,
          "variants.color": 1,
          "variants.stock": 1,
        },
      },
    ]);

    if (!product || product.length === 0) {
      return res.status(404).send("Product not found");
    }

    // Format product data
    const formattedProduct = {
      _id: product[0]._id,
      productName: product[0].productName,
      imageUrl: product[0].imageUrl,
      model: product[0].model,
      brand: product[0].brand,
      categoriesId: product[0].categoriesId,
      variants: product[0].variants.map((variant) => ({
        variants_id: variant._id,
        price: variant.price || "N/A",
        discountPrice: variant.discountPrice || "N/A",
        discountPercentage: variant.discountPercentage || "N/A",
        rating: variant.rating || "No rating",
        color: variant.color || "Unknown",
        stock: variant.stock,
      })),
    };

    // Calculate applicable offer
    const categoryOffers = offers.filter(
      (offer) =>
        offer.applicableCategory?.toString() ===
        formattedProduct.categoriesId?.toString()
    );
    const productOffers = offers.filter(
      (offer) =>
        offer.applicableProduct?.toString() === formattedProduct._id.toString()
    );

    const bestOffer = [...categoryOffers, ...productOffers].reduce(
      (maxOffer, currentOffer) =>
        !maxOffer ||
        currentOffer.discountPercentage > maxOffer.discountPercentage
          ? currentOffer
          : maxOffer,
      null
    );
    // console.log(98989898);
    // console.log(bestOffer);

    // Fetch related products
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
        $match: {
          categoriesId: formattedProduct.categoriesId,
        },
      },
      {
        $project: {
          _id: 1,
          brand: 1,
          productName: 1,
          imageUrl: 1,
          "variants._id": 1,
          "variants.color": 1,
          "variants.price": 1,
          "variants.rating": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          "variants.stock": 1,
        },
      },
    ]);

    const formattedRelatedProducts = products.map((product) => ({
      _id: product._id,
      brand: product.brand,
      productName: product.productName,
      imageUrl:
        Array.isArray(product.imageUrl) && product.imageUrl.length > 0
          ? product.imageUrl[0]
          : "/images/default-product.jpg",
      variants_id: product.variants?._id,
      color: product.variants?.color,
      price: product.variants?.price || null,
      rating: product.variants?.rating || null,
      discountPrice: product.variants?.discountPrice || null,
      discountPercentage: product.variants?.discountPercentage || null,
      stock: product.variants?.stock,
    }));

    
    // Render the view with product, related products, and the best offer

    res.render("user/viewProduct", {
      product: formattedProduct,
      relatedProducts: formattedRelatedProducts,
      offer: bestOffer,
    });
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).send("Server Error");
  }
};


exports.getVariantDetails = async (req, res) => {
  try {
    // console.log(2222222);
    const { productId, color } = req.query;

    // Validate inputs
    if (!productId || !color) {
      return res.status(400).json({ message: "Missing productId or color." });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid Product ID." });
    }

    // Fetch the variant directly from the Variant collection
    const variant = await Variant.findOne({
      productId: productId, // Match the productId
      color: { $regex: new RegExp(`^${color}$`, "i") }, // Case-insensitive color match
    });

    if (!variant) {
      return res.status(404).json({ message: "Variant not found." });
    }

    //console.log(variant);
    res.json(variant);
  } catch (error) {
    console.error("Error fetching variant details:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};


// search

exports.search = async (req, res) => {
  try {
    const { query } = req.query; // Get the search query from the URL query string

    // Ensure the query exists
    if (!query) {
      return res.status(400).send("Query parameter is required.");
    }

    // Perform an aggregation with $lookup
    const products = await Product.aggregate([
      {
        $lookup: {
          from: "variants", // Name of the collection to join
          localField: "_id", // Field from the 'Product' collection
          foreignField: "productId", // Field from the 'variants' collection
          as: "variants", // Output array field
        },
      },
      {
        $unwind: {
          path: "$variants", // Unwind the joined variants
          preserveNullAndEmptyArrays: true, // Keep products without variants
        },
      },
      {
        $match: {
          $or: [
            { productName: { $regex: query, $options: "i" } },
            { brand: { $regex: query, $options: "i" } },
            { model: { $regex: query, $options: "i" } },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          brand: 1,
          productName: 1,
          imageUrl: 1,
          "variants.color": 1,
          "variants.price": 1,
          "variants.rating": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          "variants.stock": 1,
        },
      },
    ]);



    // Render the search results in the 'user/searchResults' view
    res.render("user/searchResults", { products, query }); // Correct the path based on your folder structure
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while searching for products.");
  }
};




