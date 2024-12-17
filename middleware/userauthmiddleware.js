const User = require("../models/userModel");

module.exports = async (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      const user = await User.findById(req.session.user._id);

      // Check if user exists and is active
      if (user && user.status === "active") {
        req.user = user; // Store user data for use in controllers
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private"); // Prevent caching
        return next();
      } else {
        // Destroy session if user is inactive or not found
        req.session.destroy((err) => {
          if (err) {
            console.error("Error during session destruction:", err);
            return res.status(500).send("Session error. Please try again.");
          }
          res.clearCookie("connect.sid"); // Clear session cookie
          return res.redirect("/user/login");
        });
      }
    } else {
      // If no session, redirect to login page
      return res.redirect("/user/login");
    }
  } catch (error) {
    console.error("Error in userauthmiddleware:", error);
    return res.status(500).send("Internal server error");
  }
};
