const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const userAuthenticated = require("../middleware/userauthmildware");
const userProfileController = require("../controllers/user/userProfileAddressController");
const User = require("../controllers/userController");



// app.use(
//   session({
//     secret: "your-secret-key",
//     resave: false,
//     saveUninitialized: false,
//   })
// );





router.get("/user/login", User.loginGET);
router.post("/user/login", User.loginPOST);

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


router.post("/user/logout", User.logoutPOST);




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


//-----------------CheckoutPage------------------------------------
const checkoutController = require("../controllers/user/checkOutController");

router.get("/cart/checkout", userAuthenticated, checkoutController.getCheckout);

//Place Order
router.post("/user/checkout", checkoutController.placeOrder);


router.get("/", User.home);
router.get("/shopall", User.shopAll);
router.get("/product/:id", User.viewProduct);


// search button

router.get('/search', User.search);



module.exports = router;