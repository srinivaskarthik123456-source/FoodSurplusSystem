const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
    {
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        foodName: {
            type: String,
            required: true,
            trim: true
        },

        foodType: {
            type: String,
            required: true,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        unit: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        latitude: {
            type: Number,
            default: null
        },

        longitude: {
            type: Number,
            default: null
        },

        expiryTime: {
            type: Date,
            required: true
        },

        status: {
            type: String,

            enum: [
                "available",
                "claimed",
                "picked_up",
                "completed",
                "cancelled",
                "expired",
                "distributed"
            ],

            default: "available"
        },

        claimedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        claimedAt: {
            type: Date,
            default: null
        },

        pickedUpAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        distributedAt: {
            type: Date,
            default: null
        },

        cancelledAt: {
            type: Date,
            default: null
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("Food", foodSchema);