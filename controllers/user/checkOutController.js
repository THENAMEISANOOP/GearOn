const Address = require("../../models/addressModel");
const Cart = require("../../models/cartModel");
const Order = require("../../models/orderModel");
const ProductVariant = require("../../models/variantSchema");
const Offer = require("../../models/offerModel");
const { ObjectId } = require("mongoose").Types;
const Coupon = require("../../models/couponModel");
const mongoose = require("mongoose");
require("dotenv").config();
const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getCheckout = async (req, res) => {
  try {
    // Update expired offers
    let offers = await Offer.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    offers.forEach(async (offer) => {
      const offerEndDate = new Date(offer.endDate);
      if (offerEndDate < today) {
        offer.isActive = false;
        await offer.save();
      }
    });

    const userId = req.session.user._id;
    const userAddresses = await Address.find({ userId });

    offers = await Offer.find({ isActive: true });
    const cartItems = await Cart.find({ userId })
      .populate("productId")
      .populate("variantId");

    let subtotal = 0;
    let totalDiscount = 0;

    const formattedCartItems = cartItems.map((item) => {
      const product = item.productId;
      const discountPrice = item.variantId.discountPrice;
      const variant = item.variantId;

      let applicableOffers = [];
      let bestOffer = { discountPercentage: 0 };

      applicableOffers = offers.filter(
        (offer) =>
          offer.offerType === "Product" &&
          String(offer.applicableProduct) === String(product._id)
      );

      if (product.categoriesId) {
        const categoryOffers = offers.filter(
          (offer) =>
            offer.offerType === "Category" &&
            String(offer.applicableCategory) === String(product.categoriesId)
        );
        applicableOffers = applicableOffers.concat(categoryOffers);
      }

      if (applicableOffers.length > 0) {
        bestOffer = applicableOffers.reduce((max, current) =>
          current.discountPercentage > max.discountPercentage ? current : max
        );
      }

      const offerPercentage = bestOffer.discountPercentage || 0;
      const offerAmount = (discountPrice * offerPercentage) / 100;
      const afterOfferPrice = discountPrice - offerAmount;

      subtotal += discountPrice * item.quantity;
      totalDiscount += offerAmount * item.quantity;

      return {
        _id: item._id,
        product,
        variant,
        quantity: variant && variant.stock > 0 ? item.quantity : 0,
        offerPercentage,
        offerAmount,
        afterOfferPrice: afterOfferPrice > 0 ? afterOfferPrice : 0,
        offerType: bestOffer.offerType || null,
        offerTitle: bestOffer.title,
        couponIsApplied: bestOffer.discountPercentage > 0,
      };
    });

    const totalAfterDiscount = subtotal - totalDiscount;

    //make expired coupons Status to False
    let Coupons = await Coupon.find();
    today.setHours(0, 0, 0, 0);
    
    Coupons.forEach(async (coupon) => {
      const couponEndDate = new Date(coupon.endDate);
      if (couponEndDate < today) {
        coupon.isActive = false;
        await coupon.save();
      }
    });

    // Fetch available coupons
    const availableCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    const validCoupons = [];
    for (const coupon of availableCoupons) {
      const userUsage = coupon.usageByUser.find(
        (usage) => String(usage.userId) === String(userId)
      );

      const userUsageCount = userUsage ? userUsage.count : 0;

      if (
        totalAfterDiscount >= coupon.minimumPurchaseAmount &&
        userUsageCount < coupon.perUserUsageLimit
      ) {
        validCoupons.push(coupon);
      }
    }

    res.render("user/checkOutpage", {
      userAddresses,
      cartItems: formattedCartItems,
      subtotal,
      totalDiscount,
      totalAfterDiscount,
      availableCoupons: validCoupons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while loading the checkout page.");
  }
};

exports.placeOrder = async (req, res) => {
  try {
    // Update expired offers
    let offers = await Offer.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    offers.forEach(async (offer) => {
      const offerEndDate = new Date(offer.endDate);
      if (offerEndDate < today) {
        offer.isActive = false;
        await offer.save();
      }
    });

    const userId = req.session.user._id;
    const { selectedAddress, paymentMethod, appliedCouponCode } = req.body;

    if (!selectedAddress || !paymentMethod) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const shippingAddress = await Address.findById(selectedAddress);
    if (!shippingAddress) {
      return res.status(404).json({ error: "Invalid address selected" });
    }

    const cartItems = await Cart.find({ userId })
      .populate("productId")
      .populate("variantId");

    if (!cartItems.length) {
      return res.status(400).json({ error: "Your cart is empty" });
    }

    const activeOffers = await Offer.find({ isActive: true });

    let subtotal = 0;

    const orderItems = cartItems.map((item) => {
      const product = item.productId;
      const variant = item.variantId;
      const discountPrice = item.variantId.discountPrice;

      let applicableOffers = [];
      let bestOffer = { discountPercentage: 0 };

      applicableOffers = activeOffers.filter(
        (offer) =>
          offer.offerType === "Product" &&
          String(offer.applicableProduct) === String(product._id)
      );

      if (product.categoriesId) {
        const categoryOffers = offers.filter(
          (offer) =>
            offer.offerType === "Category" &&
            String(offer.applicableCategory) === String(product.categoriesId)
        );
        applicableOffers = applicableOffers.concat(categoryOffers);
      }

      if (applicableOffers.length > 0) {
        bestOffer = applicableOffers.reduce((max, current) =>
          current.discountPercentage > max.discountPercentage ? current : max
        );
      }

      const offerPercentage = bestOffer.discountPercentage || 0;
      const offerAmount = (discountPrice * offerPercentage) / 100;
      const priceAfterOffer = discountPrice - offerAmount;
      const itemTotalPrice = priceAfterOffer * item.quantity;

      subtotal += itemTotalPrice;

      return {
        product: {
          productId: product._id,
          brand: product.brand,
          productName: product.productName,
          imageUrl: product.imageUrl[0],
        },
        variant: {
          variantId: variant._id,
          color: variant.color,
          discountPrice: variant.discountPrice,
        },
        quantity: item.quantity,
        priceAfterOffer,
        itemTotalPrice,
      };
    });

    // Check and apply coupon
    let couponDiscount = 0;
    let totalPrice = subtotal;

    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({
        couponCode: appliedCouponCode,
        isActive: true,
      });

      if (!coupon) {
        return res.status(400).json({ error: "Invalid or expired coupon" });
      }

      if (subtotal < coupon.minimumPurchaseAmount) {
        return res.status(400).json({
          error: `Minimum purchase for coupon is ${coupon.minimumPurchaseAmount}`,
        });
      }

      couponDiscount =
        coupon.couponType === "percentage"
          ? (subtotal * coupon.couponValue) / 100
          : coupon.couponValue;

      totalPrice -= couponDiscount;
    }

    // **COD check for orders above 1000**
    if (paymentMethod === "Cash on Delivery" && totalPrice > 1000) {
      return res.status(400).json({
        error: "Cash on Delivery is not allowed for orders greater than ₹1000.",
      });
    }

    const newOrder = new Order({
      userId,
      orderItems,
      shippingAddress,
      payment: {
        paymentMethod,
        paymentStatus: paymentMethod === "Online Payment" ? "Pending" : "Paid",
      },
      totalPrice,
      couponCode: appliedCouponCode || null,
      couponDiscount,
    });

    for (const item of cartItems) {
      const variant = await ProductVariant.findById(item.variantId._id);
      if (variant.stock < item.quantity) {
        return res
          .status(400)
          .json({ error: "Insufficient stock for some items" });
      }
      variant.stock -= item.quantity;
      await variant.save();
    }

    await newOrder.save();
    await Cart.deleteMany({ userId });

    if (paymentMethod === "Online Payment") {
      const razorpayOrder = await razorpay.orders.create({
        amount: totalPrice * 100,
        currency: "INR",
        receipt: newOrder._id.toString(),
      });

      return res.status(200).json({
        success: true,
        message: "Order created successfully",
        order: razorpayOrder,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order placed successfully!",
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "An error occurred while placing the order" });
  }
};




exports.verifyPayment = async (req, res) => {
  try {
    const { paymentResponse, order } = req.body;
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${order.id}|${paymentResponse.razorpay_payment_id}`);
    const digest = shasum.digest("hex");

    if (digest === paymentResponse.razorpay_signature) {
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order.receipt },
        {
          $set: {
            "payment.paymentStatus": "Paid",
            "payment.razorpayOrderId": order.id,
            "payment.razorpayPaymentId": paymentResponse.razorpay_payment_id,
          },
        },
        { new: true }
      );

      if (!updatedOrder) {
        console.error("Order not found for Razorpay order ID:", order.id);
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      await Order.findOneAndUpdate(
        { _id: order.receipt },
        { $set: { "payment.paymentStatus": "Pending" } },
        { new: true }
      );
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }
  } catch (error) {
    console.error("Payment verification error: ", error);
    await Order.findOneAndUpdate(
      { _id: order.receipt },
      { $set: { "payment.paymentStatus": "Pending" } },
      { new: true }
    );
    return res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};


module.exports = exports;
