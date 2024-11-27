// middleware/checkSession.js
module.exports = (req, res, next) => {
    if (req.session.admin) {
      // If admin session exists, redirect to the dashboard
      return res.redirect("/admin/dashboard");
    }
    next(); // Proceed if no session exists
  };
  