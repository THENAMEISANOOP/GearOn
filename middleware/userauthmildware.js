// userauthmiddleware.js
module.exports = (req, res, next) => {
  if (req.session.user) {
    // User is authenticated, continue to the next middleware or route
    return next();
  } else {
    // User is not authenticated, redirect to login page
    return res.redirect("/user/login");
  }
};
