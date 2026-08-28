const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
    {
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true
        },

        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        feedback: {
            type: String,
            default: "",
            trim: true
        }
    },

    {
        timestamps: true
    }
);

ratingSchema.index(
    {
        foodId: 1,
        fromUser: 1
    },
    {
        unique: true
    }
);

module.exports =
    mongoose.model(
        "Rating",
        ratingSchema
    );