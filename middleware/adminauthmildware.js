// adminauthmiddleware.js
module.exports = (req, res, next) => {
  if (req.session.admin) {
    next(); // Allow access to the route
  } else {
    res.redirect("/admin/login"); // Redirect to login if session is missing
  }
};

