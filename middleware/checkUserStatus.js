const User = require("../models/userModel"); // Adjust the path based on your project structure

const checkUserStatus = async (req, res, next) => {
  try {
    const userId = req.session.userId; // Assuming the user's ID is stored in the session
    if (!userId) {
      return res.redirect("/login"); // Redirect to login if no user is logged in
    }

    const user = await User.findById(userId); // Fetch the user by their ID
    if (!user || user.status === "blocked") {
      req.session.destroy(err => { // Destroy the session if the user is blocked
        if (err) {
          console.error("Error destroying session:", err);
        }
        return res.redirect("/login"); // Redirect to login
      });
    } else {
      next(); // User is active, proceed to the next middleware/route
    }
  } catch (err) {
    console.error("Error checking user status:", err); // Log any errors for debugging
    res.status(500).send("Internal Server Error"); // Send a 500 response on error
  }
};

module.exports = checkUserStatus;
