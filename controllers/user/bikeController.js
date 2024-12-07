const Product = require("../../models/productSchema");

exports.getBikeModelsPage = async (req, res) => {
    try {
        const models = await Product.distinct("model"); // Get distinct models from the database

        // Define a mapping of model names to images
        const modelImages = {
            "Model A": "/images/KTM390.jpg",  // Correct path
            "Model B": "/images/r1.jpg",      // Correct path
            "Model C": "/images/rc.jpeg",      // Correct path
            // Add more mappings as needed
        };

        res.render("user/bikeModels", { models, modelImages });
    } catch (error) {
        console.error("Error fetching bike models:", error);
        res.status(500).render("error", { message: "Failed to fetch bike models." });
    }
};


// Fetch products based on the selected model
exports.modelfilterControl = async (req, res) => {
  try {
    const { model } = req.query;

    if (!model) {
      return res.status(400).render("error", {
        message: "Model parameter is required to search products.",
      });
    }

    // MongoDB Aggregation Pipeline
    const products = await Product.aggregate([
      { $match: { model } }, // Match products with the given model
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
          brand: 1,
          imageUrl: 1,
          "variants.color": 1,
          "variants.price": 1,
          "variants.rating": 1,
          "variants.discountPrice": 1,
          "variants.discountPercentage": 1,
          categoriesId: 1,
          "variants.stock": 1,
        },
      },
    ]);

    // Format response
    const formattedProducts = products.map((product) => ({
      _id: product._id,
      brand: product.brand,
      productName: product.productName,
      imageUrl:
        Array.isArray(product.imageUrl) && product.imageUrl.length > 0
          ? product.imageUrl[0]
          : "/images/default-product.jpg",
      price: product.variants?.price || null,
      rating: product.variants?.rating || null,
      discountPrice: product.variants?.discountPrice || null,
      discountPercentage: product.variants?.discountPercentage || null,
      categoryId: product.categoriesId,
      stock: product.variants?.stock || null,
      color: product.variants?.color || null,
    }));

    // Render the products view
    res.render("user/products", {
      products: formattedProducts,
      model,
      message: formattedProducts.length
        ? null
        : `No products found for the model "${model}".`,
    });
  } catch (error) {
    console.error("Error fetching products for model:", error);
    res.status(500).render("error", {
      message: "Failed to fetch products for the selected model.",
    });
  }
};
