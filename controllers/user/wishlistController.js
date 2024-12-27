const Wishlist = require("../../models/wishlistModel");
const Product = require("../../models/productSchema"); // Import the Product model
const Variant = require("../../models/variantSchema"); // Import the Variant model
const mongoose = require("mongoose"); // Import mongoose

// Get wishlist for a user
exports.getWishlist = async (req, res) => {
    try {
        console.log("Session Data:", req.session);  // Debug the session data

        const userId = req.session.user?._id; // Assuming userId is stored in the session
        console.log("User ID:", userId);

        // Check if userId exists (if not, return a 400 error)
        if (!userId) {
            return res.status(400).send("User not logged in or session expired.");
        }

        // Validate userId format (check if it's a valid ObjectId)
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).send("Invalid User ID.");
        }

        // Fetch wishlist items for the user
        const wishlistItems = await Wishlist.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $lookup: {
                    from: "products", // Link to the Product collection
                    localField: "productId",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            {
                $lookup: {
                    from: "variants", // Link to the Variant collection
                    localField: "variantId",
                    foreignField: "_id",
                    as: "variantDetails",
                },
            },
            {
                $unwind: "$productDetails", // Flatten productDetails array
            },
            {
                $unwind: "$variantDetails", // Flatten variantDetails array
            },
            {
                $project: {
                    _id: 1,
                    productId: 1,
                    variantId: 1,
                    addedAt: 1,
                    "productDetails.productName": 1,
                    "productDetails.imageUrl": 1,
                    "productDetails.brand": 1,
                    "variantDetails.color": 1,
                    "variantDetails.price": 1,
                    "variantDetails.discountPrice": 1,
                    "variantDetails.stock": 1,
                },
            },
        ]);
        
        console.log("Wishlist Items:", wishlistItems);

        // Handle empty or undefined wishlist items
        if (!wishlistItems || wishlistItems.length === 0) {
            return res.render("user/wishlist", { wishlistItems: [] });
        }

        res.render("user/wishlist", { wishlistItems });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("An error occurred while fetching the wishlist.");
    }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(400).json({ error: "User not logged in" });
        }

        console.log(req.body);
        const { productId, variantId } = req.body;
        const userId = req.session.user?._id;

        // Check if productId and variantId are provided
        if (!productId || !variantId) {
            return res.status(400).json({ error: "Product ID and Variant ID are required." });
        }

        // Check if the product and variant exist in the database
        const productExists = await Product.findById(productId);
        const variantExists = await Variant.findById(variantId);

        if (!productExists || !variantExists) {
            return res.status(404).json({ error: "Product or variant not found." });
        }

        // Check if the product is already in the wishlist
        const existingWishlistItem = await Wishlist.findOne({
            userId,
            productId,
            variantId,
        });

        if (existingWishlistItem) {
            return res.status(409).json({ error: "Product is already in your wishlist." });
        }

        // Create a new wishlist item
        const newWishlistItem = new Wishlist({ userId, productId, variantId });

        await newWishlistItem.save();
        console.log("New Wishlist Item:", newWishlistItem);

        res.status(201).json({ message: "Product added to wishlist." });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ error: "Failed to add to wishlist." });
    }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { wishlistId } = req.params;

        // Check if the wishlist item exists
        const wishlistItem = await Wishlist.findById(wishlistId);
        if (!wishlistItem) {
            return res.status(404).send({ error: "Wishlist item not found." });
        }

        await Wishlist.findByIdAndDelete(wishlistId);
        res.status(200).send({ message: "Item removed from wishlist." });
    } catch (error) {
        console.error("Error removing wishlist item:", error);
        res.status(500).send({ error: "Failed to remove item from wishlist." });
    }
};
