const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const userAuthenticated = require("../middleware/userauthmildware");
const userProfileController = require("../controllers/user/userProfileAddressController");
const User = require("../controllers/userController");
const ShopAllController = require("../controllers/user/ShopAllController");




// app.use(
//   session({
//     secret: "your-secret-key",
//     resave: false,
//     saveUninitialized: false,
//   })
// );



// user login 

router.get("/user/login", User.loginGET);
router.post("/user/login",User.loginPOST);

// forgot pasword

//--------------------user Login --------------------
const forgotPassword = require("../controllers/forgotPasswordController");

router.get("/user/forgotPassword", forgotPassword.getForgotPassword);
router.post("/user/forgotPassword/send-otp", forgotPassword.sendForgotPasswordOTP);
router.post("/user/forgotPassword/verify-otp", forgotPassword.verifyForgotPasswordOTP);
router.post("/user/forgotPassword/reset-password", forgotPassword.resetPassword);
router.post("/user/forgotPassword/resend-otp", forgotPassword.resendForgotPasswordOTP);



router.get("/user/signup", User.signupGET);
router.post("/user/signup", User.signupPOST);
router.post("/user/verify-otp", User.verifyOTP);
router.post("/user/resend-otp", User.resendOTP);


//User Dashboard 
//-------------------- Personal info Dashboard --------------------
router.get("/user/profile", userAuthenticated,userProfileController.getPersonalInformation);
router.post("/user/profile", userProfileController.updatePersonalInformation);



//-------------------- Address info Dashboard --------------------
// Add address
router.post("/user/address/add", userProfileController.addAddress);

// Get all addresses
router.get("/user/address", userAuthenticated,userProfileController.getUserAddresses);

// Update an address
router.get("/user/address/edit/:id", userAuthenticated,userProfileController.getEditAddress);
router.post("/user/address/edit/:id", userProfileController.updateAddress);

// Delete an address
router.delete("/user/address/:id", userProfileController.deleteAddress);



//-------------------- My Orders Dashboard --------------------
const myOrders = require("../controllers/user/myOrdersController");

// Get all orders
router.get("/user/orders", userAuthenticated, myOrders.getMyOrders);

// View order Details
router.get("/user/order/details/:id",userAuthenticated, myOrders.getOrderDetails);

router.post("/order/cancel", myOrders.cancelOrderItem);


router.post("/user/logout", userProfileController.logoutPOST);




//-------------------- Change password Dashboard --------------------
const changePassword = require("../controllers/user/changePasswordController");

router.get("/user/changePassword", userAuthenticated,changePassword.getChangePassword);
router.post("/user/changePassword", changePassword.postChangePassword);


//--------------------Cart----------------------------------------- 
const cartController = require("../controllers/user/cartController");


router.post("/cart/add", cartController.addToCart);
router.get("/shop/cart", userAuthenticated, cartController.getCart);
router.delete("/cart/:id", cartController.deleteFromCart);
router.put("/cart/:id", cartController.updateCartQuantity);
// router.get("/variant/:cartItemId", cartController.getVariantStock);



//-----------------CheckoutPage------------------------------------
const checkoutController = require("../controllers/user/checkOutController");

router.get("/cart/checkout", userAuthenticated, checkoutController.getCheckout);

//Place Order
router.post("/user/checkout", checkoutController.placeOrder);


// view home

router.get("/", User.home);

//--------------------View Product Page --------------------
router.get("/product/:id", User.viewProduct);

router.get("/product/getcolor/variant", User.getVariantDetails);



//--------------------SHOP ALL Page --------------------
router.get("/shopall", ShopAllController.shopAll);
// router.get("/products/filter", ShopAllController.filterProducts);
router.get("/products/filter-options", ShopAllController.getFilterOptions);
// router.get("/products/search", ShopAllController.searchProducts);

router.get("/products/searchFilter", ShopAllController.searchAndFilterProducts);


// search button

router.get('/search', User.search);

// model tosearch

const bikeController = require("../controllers/user/bikeController");

// Route to display bike models
router.get("/bikeModels", bikeController.getBikeModelsPage);

// Route to display products for a specific bike model
router.get("/products", bikeController.modelfilterControl);


//--------------------Wishlist----------------------------------------- 
const wishlistController = require("../controllers/user/wishlistController");

router.get("/user/wishlist", userAuthenticated, wishlistController.getWishlist);
router.post("/wishlist/add",  wishlistController.addToWishlist);
router.delete('/wishlist/remove/:wishlistId', wishlistController.removeFromWishlist);


// /-------------------- Wallet Dashboard --------------------
const userWallet = require("../controllers/user/walletController");

router.get("/user/wallet", userAuthenticated,userWallet.getWallet);












module.exports = router;