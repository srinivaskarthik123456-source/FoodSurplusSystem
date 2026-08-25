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
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        unit: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            required: true
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
        }
    },

    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "Food",
        foodSchema
    );