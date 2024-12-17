exports.home = (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private"); // Prevent caching
    res.render("/", { user: req.user }); // Pass user data to the home view
  };
  