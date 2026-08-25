const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");
const Food = require("./models/Food");

const app = express();

app.use(cors());
app.use(express.json());

// ==================================================
// MONGODB CONNECTION
// ==================================================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error.message);
    });

// ==================================================
// JWT SECRET
// ==================================================

const JWT_SECRET =
    process.env.JWT_SECRET || "food_surplus_secret";

// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Food Surplus System Backend is running!"
    });
});

// ==================================================
// REGISTER
// ==================================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            password,
            role
        } = req.body;

        if (!name || !email || !phone || !address || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email, phone, address and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 6 characters"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const allowedRoles = [
            "donor",
            "receiver",
            "admin"
        ];

        const userRole =
            allowedRoles.includes(role)
                ? role
                : "donor";

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            address: address.trim(),
            password: hashedPassword,
            role: userRole
        });

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });

    } catch (error) {
        console.log("Register error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// ==================================================
// LOGIN
// ==================================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });

    } catch (error) {
        console.log("Login error:", error.message);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

// ==================================================
// GET ALL USERS
// ==================================================

app.get("/api/users", async (req, res) => {
    try {
        const users = await User
            .find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.log("Get users error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
});

// ==================================================
// GET SINGLE USER
// ==================================================

app.get("/api/users/:id", async (req, res) => {
    try {
        const user = await User
            .findById(req.params.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.log("Get user error:", error.message);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch user"
        });
    }
});

// ==================================================
// UPDATE USER
// ==================================================

app.put("/api/users/:id", async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            address,
            password,
            role
        } = req.body;

        const updateData = {};

        if (name) {
            updateData.name = name.trim();
        }

        if (email) {
            updateData.email =
                email.toLowerCase().trim();
        }

        if (phone) {
            updateData.phone = phone.trim();
        }

        if (address) {
            updateData.address = address.trim();
        }

        if (role) {
            updateData.role = role;
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 6 characters"
                });
            }

            updateData.password =
                await bcrypt.hash(password, 10);
        }

        const user =
            await User.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found"
            });
        }

        res.json({
            success: true,
            message:
                "User updated successfully",
            user
        });

    } catch (error) {
        console.log(
            "Update user error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update user"
        });
    }
});

// ==================================================
// DELETE USER
// ==================================================

app.delete("/api/users/:id", async (req, res) => {
    try {
        const user =
            await User.findByIdAndDelete(
                req.params.id
            );

        if (!user) {
            return res.status(404).json({
                success: false,
                message:
                    "User not found"
            });
        }

        res.json({
            success: true,
            message:
                "User deleted successfully"
        });

    } catch (error) {
        console.log(
            "Delete user error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to delete user"
        });
    }
});

// ==================================================
// ADD FOOD
// ==================================================

app.post("/api/food", async (req, res) => {
    try {
        const {
            donorId,
            foodName,
            foodType,
            quantity,
            unit,
            description,
            location,
            expiryTime
        } = req.body;

        if (
            !donorId ||
            !foodName ||
            !foodType ||
            !quantity ||
            !unit ||
            !location ||
            !expiryTime
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide all required food details"
            });
        }

        const donor =
            await User.findById(donorId);

        if (!donor || donor.role !== "donor") {
            return res.status(404).json({
                success: false,
                message:
                    "Valid donor not found"
            });
        }

        const food = await Food.create({
            donorId,
            foodName: foodName.trim(),
            foodType,
            quantity: Number(quantity),
            unit,
            description: description || "",
            location: location.trim(),
            expiryTime,
            status: "available"
        });

        res.status(201).json({
            success: true,
            message:
                "Surplus food added successfully",
            food
        });

    } catch (error) {
        console.log(
            "Add food error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to add surplus food"
        });
    }
});

// ==================================================
// GET AVAILABLE FOOD
// ==================================================

app.get("/api/food", async (req, res) => {
    try {
        await Food.updateMany(
            {
                status: "available",
                expiryTime: {
                    $lt: new Date()
                }
            },
            {
                $set: {
                    status: "expired"
                }
            }
        );

        const foods = await Food
            .find({
                status: "available"
            })
            .populate(
                "donorId",
                "name email phone address"
            )
            .sort({
                createdAt: -1
            });

        const formattedFoods = foods.map(food => {
            const foodObject = food.toObject();

            return {
                ...foodObject,

                donorPhone:
                    food.donorId?.phone || "",

                donorAddress:
                    food.donorId?.address || "",

                donorName:
                    food.donorId?.name || "",

                donorEmail:
                    food.donorId?.email || "",

                mapsUrl: food.location
                    ? "https://www.google.com/maps/dir/?api=1&destination=" +
                      encodeURIComponent(food.location)
                    : ""
            };
        });

        res.json({
            success: true,
            count: formattedFoods.length,
            foods: formattedFoods
        });

    } catch (error) {
        console.log(
            "Get food error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch available food"
        });
    }
});

// ==================================================
// GET ALL FOOD - ADMIN
// ==================================================

app.get("/api/admin/food", async (req, res) => {
    try {
        const foods = await Food
            .find()
            .populate(
                "donorId",
                "name email phone address"
            )
            .populate(
                "claimedBy",
                "name email phone address"
            )
            .sort({
                createdAt: -1
            });

        res.json({
            success: true,
            count: foods.length,
            foods
        });

    } catch (error) {
        console.log(
            "Admin food error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch all food"
        });
    }
});

// ==================================================
// GET FOOD BY ID
// ==================================================

app.get("/api/food/:id", async (req, res) => {
    try {
        const food = await Food
            .findById(req.params.id)
            .populate(
                "donorId",
                "name email phone address"
            )
            .populate(
                "claimedBy",
                "name email phone address"
            );

        if (!food) {
            return res.status(404).json({
                success: false,
                message:
                    "Food not found"
            });
        }

        const foodData = {
            ...food.toObject(),

            donorPhone:
                food.donorId?.phone || "",

            donorAddress:
                food.donorId?.address || "",

            donorName:
                food.donorId?.name || "",

            donorEmail:
                food.donorId?.email || "",

            mapsUrl: food.location
                ? "https://www.google.com/maps/dir/?api=1&destination=" +
                  encodeURIComponent(food.location)
                : ""
        };

        res.json({
            success: true,
            food: foodData
        });

    } catch (error) {
        console.log(
            "Get food by ID error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch food"
        });
    }
});

// ==================================================
// GET FOOD BY DONOR
// ==================================================

app.get(
    "/api/food/donor/:donorId",
    async (req, res) => {
        try {
            const foods = await Food
                .find({
                    donorId:
                        req.params.donorId
                })
                .sort({
                    createdAt: -1
                });

            res.json({
                success: true,
                count: foods.length,
                foods
            });

        } catch (error) {
            console.log(
                "Get donor food error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch donor food"
            });
        }
    }
);

// ==================================================
// GET CLAIMED FOOD BY RECEIVER
// ==================================================

app.get(
    "/api/food/receiver/:receiverId",
    async (req, res) => {
        try {
            const foods = await Food
                .find({
                    claimedBy:
                        req.params.receiverId
                })
                .populate(
                    "donorId",
                    "name email phone address"
                )
                .sort({
                    claimedAt: -1
                });

            res.json({
                success: true,
                count: foods.length,
                foods
            });

        } catch (error) {
            console.log(
                "Get receiver food error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch claimed food"
            });
        }
    }
);

// ==================================================
// CLAIM FOOD
// ==================================================

app.put(
    "/api/food/:id/claim",
    async (req, res) => {
        try {
            const {
                receiverId
            } = req.body;

            if (!receiverId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Receiver ID is required"
                });
            }

            const receiver =
                await User.findById(
                    receiverId
                );

            if (
                !receiver ||
                receiver.role !== "receiver"
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Valid receiver not found"
                });
            }

            const food =
                await Food.findOne({
                    _id: req.params.id,
                    status: "available"
                });

            if (!food) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Food is not available or already claimed"
                });
            }

            if (
                new Date(food.expiryTime) <
                new Date()
            ) {
                food.status = "expired";

                await food.save();

                return res.status(400).json({
                    success: false,
                    message:
                        "This food has expired"
                });
            }

            food.claimedBy = receiverId;
            food.claimedAt = new Date();
            food.status = "claimed";

            await food.save();

            const updatedFood =
                await Food
                    .findById(food._id)
                    .populate(
                        "donorId",
                        "name email phone address"
                    )
                    .populate(
                        "claimedBy",
                        "name email phone address"
                    );

            res.json({
                success: true,
                message:
                    "Food claimed successfully",
                food: updatedFood
            });

        } catch (error) {
            console.log(
                "Claim food error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to claim food"
            });
        }
    }
);

// ==================================================
// UPDATE FOOD
// ==================================================

app.put("/api/food/:id", async (req, res) => {
    try {
        const {
            foodName,
            foodType,
            quantity,
            unit,
            description,
            location,
            expiryTime,
            status
        } = req.body;

        const updateData = {};

        if (foodName !== undefined) {
            updateData.foodName = foodName;
        }

        if (foodType !== undefined) {
            updateData.foodType = foodType;
        }

        if (quantity !== undefined) {
            updateData.quantity =
                Number(quantity);
        }

        if (unit !== undefined) {
            updateData.unit = unit;
        }

        if (description !== undefined) {
            updateData.description =
                description;
        }

        if (location !== undefined) {
            updateData.location = location;
        }

        if (expiryTime !== undefined) {
            updateData.expiryTime =
                expiryTime;
        }

        if (status !== undefined) {
            updateData.status = status;
        }

        const food =
            await Food.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true,
                    runValidators: true
                }
            );

        if (!food) {
            return res.status(404).json({
                success: false,
                message:
                    "Food not found"
            });
        }

        res.json({
            success: true,
            message:
                "Food updated successfully",
            food
        });

    } catch (error) {
        console.log(
            "Update food error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to update food"
        });
    }
});

// ==================================================
// DELETE FOOD
// ==================================================

app.delete("/api/food/:id", async (req, res) => {
    try {
        const food =
            await Food.findByIdAndDelete(
                req.params.id
            );

        if (!food) {
            return res.status(404).json({
                success: false,
                message:
                    "Food not found"
            });
        }

        res.json({
            success: true,
            message:
                "Food deleted successfully"
        });

    } catch (error) {
        console.log(
            "Delete food error:",
            error.message
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to delete food"
        });
    }
});

// ==================================================
// ADMIN DASHBOARD STATISTICS
// ==================================================

app.get(
    "/api/admin/stats",
    async (req, res) => {
        try {
            await Food.updateMany(
                {
                    status: "available",
                    expiryTime: {
                        $lt: new Date()
                    }
                },
                {
                    $set: {
                        status: "expired"
                    }
                }
            );

            const totalUsers =
                await User.countDocuments();

            const totalDonors =
                await User.countDocuments({
                    role: "donor"
                });

            const totalReceivers =
                await User.countDocuments({
                    role: "receiver"
                });

            const totalAdmins =
                await User.countDocuments({
                    role: "admin"
                });

            const totalFood =
                await Food.countDocuments();

            const availableFood =
                await Food.countDocuments({
                    status: "available"
                });

            const claimedFood =
                await Food.countDocuments({
                    status: "claimed"
                });

            const expiredFood =
                await Food.countDocuments({
                    status: "expired"
                });

            const distributedFood =
                await Food.countDocuments({
                    status: "distributed"
                });

            res.json({
                success: true,
                stats: {
                    totalUsers,
                    totalDonors,
                    totalReceivers,
                    totalAdmins,
                    totalFood,
                    availableFood,
                    claimedFood,
                    expiredFood,
                    distributedFood
                }
            });

        } catch (error) {
            console.log(
                "Admin stats error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to fetch admin statistics"
            });
        }
    }
);

// ==================================================
// SERVER
// ==================================================

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        "Server running on http://localhost:" + PORT
    );
});