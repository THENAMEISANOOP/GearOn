const mongoose = require("mongoose");

mongoose
  .connect("mongodb://localhost:27017/GearOn")
  .then(() => {
    console.log("MongoDB is successfully connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });