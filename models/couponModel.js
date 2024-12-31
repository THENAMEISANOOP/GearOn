const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        couponCode: {
            type: String,
            required: true,
            unique: true,
            index: true, // Added index for better query performance
        },
        couponType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
        },
        couponValue: {
            type: Number,
            required: true,
        },
        minimumPurchaseAmount: {
            type: Number,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
            validate: {
                validator: function (v) {
                    return v > this.startDate; // Ensures endDate is after startDate
                },
                message: "End date must be after start date",
            },
        },
        perUserUsageLimit: {
            type: Number,
            required: true,
            min: 1,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        usageByUser: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                count: {
                    type: Number,
                    default: 0,
                },
            },
        ],
    },
    { timestamps: true }
);

// Add index for performance improvement on isActive
couponSchema.index({ isActive: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
