const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { // If the user is authenticated
        return next();
    }
    res.redirect("/user/login"); // Redirect to login page if not authenticated
};

module.exports = { isAuthenticated };
