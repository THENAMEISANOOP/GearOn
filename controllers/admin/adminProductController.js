// const userAuthenticated = require("../middleware/adminauthmildware");
require("dotenv").config();
const Product = require("../../models/productSchema");
const Variant = require("../../models/variantSchema");
const Category = require("../../models/categoryModel");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "product_variants",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage: storage });

exports.getProducts = [
  //   userAuthenticated,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      // Populate the category field
      const products = await Product.find()
        .populate("categoriesId") // Populate category details
        .skip(skip)
        .limit(limit)
        .lean(); // Use .lean() for faster queries and to convert Mongoose documents to plain JavaScript objects
      const totalProducts = await Product.countDocuments();
      const totalPages = Math.ceil(totalProducts / limit);

      // console.log(products)
      res.render("admin/adminProduct", {
        message: req.query.message || undefined,
        products,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      res.status(500).send("Error fetching products");
    }
  },
];


exports.getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find();
    res.render("admin/adminAddProduct", {
      pageTitle: "Add Product",
      path: "/admin/products/add",
      categories: categories,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).send("Error fetching categories");
  }
};

exports.postAddProduct = async (req, res) => {
  try {
    const { productName, brand, model, categoriesId, imageUrls, description } = req.body;

    if (!productName || !brand || !model || !imageUrls) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newProduct = new Product({
      productName,
      brand,
      model,
      categoriesId,
      imageUrl: imageUrls,
      description, // Add description field
    });

    const savedProduct = await newProduct.save();

    res.status(200).json({
      message: "Product added successfully",
      productId: savedProduct._id,
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ error: "Error adding product" });
  }
};


exports.getProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    // Fetch product by ID
    const product = await Product.findById(productId);
    if (!product) {
      console.log("Product not found");
      return res.status(404).json({ error: "Product not found" });
    }

    // Fetch variants associated with the product
    const variants = await Variant.find({ productId });

    // Fetch all categories for dropdown or display
    const categories = await Category.find();

    // Fetch the product's category details, including description
    const productCategory = await Category.findOne(
      { _id: product.categoriesId },
      { categoriesName: 1, description: 1 } // Ensure projection object is correctly formatted
    );

    // Respond with product details, variants, and categories
    res.status(200).json({
      product: {
        productName: product.productName,
        brand: product.brand,
        model: product.model,
        photos: product.imageUrl,
        categoryName: productCategory ? productCategory.categoriesName : null,
        description: productCategory ? productCategory.description : null,
      },
      variants: variants.map((variant) => ({
        _id: variant._id,
        color: variant.color,
        price: variant.price,
        rating: variant.rating,
        discountPrice: variant.discountPrice,
        discountPercentage: variant.discountPercentage,
      })),
      categories,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ error: "Failed to fetch product details" });
  }
};



//---------------POST Update Product----------------------
exports.updateProductDetails = async (req, res) => {
  try {
    const { productName, brand, model, variants, categoriesId, imageUrls } =
      req.body;  

    if (!productName || !brand || !model || !categoriesId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { productName, brand, model, categoriesId },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (Array.isArray(variants)) {
      for (const variant of variants) {
        if (variant._id) {
          await Variant.findByIdAndUpdate(
            variant._id,
            {
              color: variant.color,
              price: variant.price,
              discountPrice: variant.discountPrice,
              discountPercentage: variant.discountPercentage,
              rating: variant.rating
            },
            { new: true }
          );
        } else {
          await new Variant({
            ...variant,
            productId: req.params.id,
          }).save();
        }
      }
    }

    res
      .status(200)
      .json({ message: "Product and variants updated successfully" });
  } catch (err) {
    console.error("Error updating product details:", err.message, err.stack);
    res.status(500).json({ error: "Error updating product details" });
  }
};


exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (deletedProduct) {
      await Variant.deleteMany({ productId: req.params.id });
    }

    res.redirect(
      "/admin/products?message=Product%20and%20its%20variants%20deleted%20successfully"
    );
  } catch (err) {
    console.error("Error deleting product and its variants:", err);
    res.status(500).send("Error deleting product and its variants");
  }
};



exports.getAddvariant = async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res.status(400).send("Product ID is required");
  }

  try {
    res.render("admin/adminAddvariant", {
      pageTitle: "Add Variant",
      path: "/admin/products/add/variant",
      productId,
    });
  } catch (err) {
    console.error("Error rendering add variant form:", err);
    res.status(500).send("Error rendering add variant form");
  }
};


exports.postAddvariant = async (req, res) => {
  try {
    const {
      productId,
      color,
      price,
      discountPrice,
      discountPercentage,
      rating,
    } = req.body;

    // console.log(
    //   productId + " "
    //   + color + " " +
    //   price + " "+
    //   discountPrice + "  "+
    //   discountPercentage + " "+
    //   rating
    // );

    if (!productId || !color || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newVariant = new Variant({
      productId,
      color,
      price,
      discountPrice,
      discountPercentage,
      rating,
    });

    await newVariant.save();
    res.redirect("/admin/products")
  } catch (err) {
    console.error("Error adding product variant:", err);
    res.status(500).json({ error: "Error adding product variant" });
  }
};



exports.postAddCategory = async (req, res) => {
  try {
    const { categoriesName, description } = req.body; // Ensure description is captured
    console.log(req.body)

    if (!categoriesName) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const newCategory = new Category({
      categoriesName,
      description, // Include description here
    });

    await newCategory.save();
    res.status(200).json({ message: "Category added successfully" });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ error: "Error adding category" });
  }
};
