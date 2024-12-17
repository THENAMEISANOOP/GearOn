const express = require("express");
const router = express.Router();

const publicUser = require("../controllers/publicUserController");
const userauthmiddleware = require("../middleware/userauthmiddleware");

// Protected Home Route
router.get("/", userauthmiddleware, publicUser.home);

module.exports = router;
