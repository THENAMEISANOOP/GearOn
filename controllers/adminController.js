const userAuthenticated = require("../middleware/adminauthmildware");
const User = require("../models/userModel");  


// adminController.js
exports.getLogin = (req, res) => {
  if (req.session.admin) {
    // Set headers to prevent browser caching
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.redirect("/admin/dashboard"); // Redirect if admin is already logged in
  } else {
    // Render the admin login page
    res.render("admin/adminLogin", { error: null });
  }
};



exports.postLogin = (req, res) => {
  res.clearCookie("connect.sid");  
  if (
    process.env.ADMIN_EMAIL === req.body.email &&
    process.env.ADMIN_PASSWORD === req.body.password
  ) {
    req.session.admin = true;
    res.redirect("/admin/dashboard");
  } else {
    return res.render("admin/adminLogin", {
      error: "Wrong Admin email or password",
    });
  }
};


// adminController.js

// Admin logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/admin/dashboard");
    }

    // Clear cookies and disable cache
    res.clearCookie("connect.sid");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.redirect("/admin/login");
  });
};





// adminController.js
exports.getDashboard = (req, res) => {
  // Prevent caching of this page
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.render("admin/adminDashboard"); // Render admin dashboard
};

 
///////////////////Dashboard Customers-------------------

exports.getCustomers = [
  userAuthenticated,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; 
      const limit = 12; 
      const skip = (page - 1) * limit;

      const customers = await User.find().skip(skip).limit(limit);
      const totalCustomers = await User.countDocuments();
      const totalPages = Math.ceil(totalCustomers / limit);

      res.render("admin/adminCustomers", {
        customers,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      res.status(500).send("Error fetching customers");
    }
  },
];

// Unblock a customer
exports.unblockCustomer = [
  async (req, res) => {
    try {
      const customerId = req.params.id;
      const updatedCustomer = await User.findByIdAndUpdate(customerId, { status: "active" }, { new: true });
      
      if (!updatedCustomer) {
        return res.status(404).send("Customer not found");
      }

      res.json({ success: true, message: "Customer unblocked successfully" }); // Respond with success
    } catch (err) {
      console.error(err);  // Log the error for debugging
      res.status(500).send("Error unblocking customer");
    }
  },
];

// Block a customer
exports.blockCustomer = [
  async (req, res) => {
    try {
      const customerId = req.params.id;
      const updatedCustomer = await User.findByIdAndUpdate(customerId, { status: "blocked" }, { new: true });

      if (!updatedCustomer) {
        return res.status(404).send("Customer not found");
      }

      res.json({ success: true, message: "Customer blocked successfully" }); // Respond with success
    } catch (err) {
      console.error(err);  // Log the error for debugging
      res.status(500).send("Error blocking customer");
    }
  },
];


exports.updateStatus = [
  async (req, res) => {
    try {
      const customerId = req.params.id;
      const status = req.body.status;

      await User.findByIdAndUpdate(customerId, { status });

      res.json({ success: true });
    } catch (err) {
      res.json({ success: false, message: "Error updating status" });
    }
  },
];



///////////////////Dashboard Category-------------------
const Category = require("../models/categoryModel");

exports.getCategories = [
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const categories = await Category.find().skip(skip).limit(limit);
      const totalCategories = await Category.countDocuments();
      const totalPages = Math.ceil(totalCategories / limit);

      res.render("admin/adminCategory", {
        message: req.query.message || undefined,
        categories,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      res.status(500).send("Error fetching categories");
    }
  },
];



exports.addCategory = [
  async (req, res) => {
    try {
      // const categoryName = req.body.categoriesName.trim().toLowerCase();
      const lowerCategoryName = req.body.categoriesName.trim().toLowerCase();
      const categoryName =
        lowerCategoryName.charAt(0).toUpperCase() + lowerCategoryName.slice(1);


      const existingCategory = await Category.findOne({
        categoriesName: categoryName,
      });
      if (existingCategory) {
        const categories = await Category.find();
        const totalPages = Math.ceil((await Category.countDocuments()) / 10);
        return res.render("admin/adminCategory", {
          error: "Category already exists",
          categories,
          currentPage: 1,
          totalPages,
        });
      }

      const newCategory = new Category({
        categoriesName: categoryName,
      });

      await newCategory.save();
      res.redirect("/admin/category");
    } catch (err) {
      res.status(500).send("Error adding category");
    }
  }
];


exports.updateCategory = async (req, res) => {
  try {

    const lowerCategoryName = req.body.categoriesName.trim().toLowerCase();
    const categoriesName =
      lowerCategoryName.charAt(0).toUpperCase() + lowerCategoryName.slice(1);

    await Category.findByIdAndUpdate(req.params.id, {
      categoriesName,

    });
    res.redirect("/admin/category");
  } catch (err) {
    res.status(500).send("Error updating category");
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.redirect("/admin/category");
  } catch (err) {
    res.status(500).send("Error deleting category");
  }
};