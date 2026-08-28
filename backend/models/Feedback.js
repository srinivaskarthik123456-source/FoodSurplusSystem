```javascript
const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true
        },

        fromUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        toUserId: {
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

        comment: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Feedback",
    feedbackSchema
);
```
