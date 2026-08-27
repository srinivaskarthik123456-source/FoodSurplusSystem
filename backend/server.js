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
        console.log(
            "MongoDB connection failed:",
            error.message
        );
    });


// ==================================================
// JWT SECRET
// ==================================================

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "food_surplus_secret";


// ==================================================
// HOME
// ==================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message:
            "Food Surplus System Backend is running!"
    });

});


// ==================================================
// GEOCODING
// LOCATION TEXT → LATITUDE/LONGITUDE
// ==================================================

async function geocodeLocation(location) {

    try {

        if (!location || !location.trim()) {
            return null;
        }

        const query =
            encodeURIComponent(
                location.trim()
            );

        const url =
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`;

        const response =
            await fetch(url, {
                headers: {
                    "User-Agent":
                        "FoodSurplusSystem/1.0"
                }
            });

        if (!response.ok) {

            console.log(
                "Geocoding request failed:",
                response.status
            );

            return null;
        }

        const results =
            await response.json();

        if (
            !results ||
            results.length === 0
        ) {

            console.log(
                "Location not found:",
                location
            );

            return null;
        }

        const result =
            results[0];

        const latitude =
            Number(result.lat);

        const longitude =
            Number(result.lon);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return null;
        }

        console.log(
            "GEOCODED LOCATION:",
            location
        );

        console.log(
            "Latitude:",
            latitude
        );

        console.log(
            "Longitude:",
            longitude
        );

        return {
            latitude,
            longitude,
            displayName:
                result.display_name || location
        };

    } catch (error) {

        console.log(
            "Geocoding error:",
            error.message
        );

        return null;
    }
}


// ==================================================
// ROUTING
// TWO COORDINATES → ROAD DISTANCE + TRAVEL TIME
// ==================================================

async function getRoadRoute(
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude
) {

    try {

        const values = [
            originLatitude,
            originLongitude,
            destinationLatitude,
            destinationLongitude
        ];

        if (
            values.some(
                value =>
                    !Number.isFinite(
                        Number(value)
                    )
            )
        ) {

            return null;
        }

        /*
         * OSRM coordinate format:
         * longitude,latitude
         */

        const coordinates =
            `${Number(originLongitude)},${Number(originLatitude)};` +
            `${Number(destinationLongitude)},${Number(destinationLatitude)}`;

        const url =
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`;

        const response =
            await fetch(url);

        if (!response.ok) {

            console.log(
                "Routing request failed:",
                response.status
            );

            return null;
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !data.routes ||
            data.routes.length === 0
        ) {

            console.log(
                "No route found"
            );

            return null;
        }

        const route =
            data.routes[0];

        const distanceMeters =
            Number(route.distance);

        const durationSeconds =
            Number(route.duration);

        const distanceKm =
            distanceMeters / 1000;

        const durationMinutes =
            Math.ceil(
                durationSeconds / 60
            );

        return {

            distanceKm:
                Number(
                    distanceKm.toFixed(2)
                ),

            distanceMeters:

                Math.round(
                    distanceMeters
                ),

            durationMinutes,

            durationSeconds,

            /*
             * Human readable format
             */

            travelTime:

                durationMinutes < 60

                    ? `${durationMinutes} mins`

                    : `${Math.floor(
                          durationMinutes / 60
                      )} hr ${
                          durationMinutes % 60
                      } mins`
        };

    } catch (error) {

        console.log(
            "Routing error:",
            error.message
        );

        return null;
    }
}


// ==================================================
// REGISTER
// ==================================================

app.post(
    "/api/auth/register",
    async (req, res) => {

        try {

            const {
                name,
                email,
                phone,
                address,
                password,
                role
            } = req.body;

            if (
                !name ||
                !email ||
                !phone ||
                !address ||
                !password
            ) {

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

            const normalizedEmail =
                email.toLowerCase().trim();

            const existingUser =
                await User.findOne({
                    email:
                        normalizedEmail
                });

            if (existingUser) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User already exists"
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const allowedRoles = [
                "donor",
                "receiver",
                "admin"
            ];

            const userRole =
                allowedRoles.includes(role)
                    ? role
                    : "donor";

            const user =
                await User.create({

                    name:
                        name.trim(),

                    email:
                        normalizedEmail,

                    phone:
                        phone.trim(),

                    address:
                        address.trim(),

                    password:
                        hashedPassword,

                    role:
                        userRole
                });

            res.status(201).json({

                success: true,

                message:
                    "Registration successful",

                user: {

                    id:
                        user._id.toString(),

                    _id:
                        user._id.toString(),

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    address:
                        user.address,

                    role:
                        user.role
                }
            });

        } catch (error) {

            console.log(
                "Register error:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error"
            });
        }
    }
);


// ==================================================
// LOGIN
// ==================================================

app.post(
    "/api/auth/login",
    async (req, res) => {

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

            const normalizedEmail =
                email.toLowerCase().trim();

            const user =
                await User.findOne({
                    email:
                        normalizedEmail
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

            const token =
                jwt.sign(
                    {
                        id:
                            user._id.toString(),

                        role:
                            user.role
                    },

                    JWT_SECRET,

                    {
                        expiresIn:
                            "1d"
                    }
                );

            res.json({

                success: true,

                message:
                    "Login successful",

                token,

                user: {

                    id:
                        user._id.toString(),

                    _id:
                        user._id.toString(),

                    name:
                        user.name,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    address:
                        user.address,

                    role:
                        user.role
                }
            });

        } catch (error) {

            console.log(
                "Login error:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Server error"
            });
        }
    }
);


// ==================================================
// GET ALL USERS
// ==================================================

app.get(
    "/api/users",
    async (req, res) => {

        try {

            const users =
                await User
                    .find()
                    .select("-password")
                    .sort({
                        createdAt: -1
                    });

            res.json({

                success: true,

                count:
                    users.length,

                users
            });

        } catch (error) {

            console.log(
                "Get users error:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch users"
            });
        }
    }
);


// ==================================================
// GET SINGLE USER
// ==================================================

app.get(
    "/api/users/:id",
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID"
                });
            }

            const user =
                await User
                    .findById(
                        req.params.id
                    )
                    .select("-password");

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"
                });
            }

            res.json({

                success: true,

                user
            });

        } catch (error) {

            console.log(
                "Get user error:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to fetch user"
            });
        }
    }
);


// ==================================================
// UPDATE USER
// ==================================================

app.put(
    "/api/users/:id",
    async (req, res) => {

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

            if (name)
                updateData.name =
                    name.trim();

            if (email)
                updateData.email =
                    email
                        .toLowerCase()
                        .trim();

            if (phone)
                updateData.phone =
                    phone.trim();

            if (address)
                updateData.address =
                    address.trim();

            if (role)
                updateData.role =
                    role;

            if (password) {

                if (
                    password.length < 6
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Password must contain at least 6 characters"
                    });
                }

                updateData.password =
                    await bcrypt.hash(
                        password,
                        10
                    );
            }

            const user =
                await User.findByIdAndUpdate(
                    req.params.id,
                    updateData,
                    {
                        new: true,
                        runValidators: true
                    }
                )
                .select("-password");

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
    }
);


// ==================================================
// DELETE USER
// ==================================================

app.delete(
    "/api/users/:id",
    async (req, res) => {

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
    }
);


// ==================================================
// ADD FOOD
// ==================================================

app.post(
    "/api/food",
    async (req, res) => {

        try {

            const {
                donorId,
                foodName,
                foodType,
                quantity,
                unit,
                description,
                location,
                latitude,
                longitude,
                expiryTime
            } = req.body;


            console.log("");
            console.log(
                "================================"
            );
            console.log(
                "ADD FOOD REQUEST"
            );
            console.log(
                "Donor ID:",
                donorId
            );
            console.log(
                "Food Name:",
                foodName
            );
            console.log(
                "Location:",
                location
            );
            console.log(
                "================================"
            );


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


            // ==================================================
            // CHECK DONOR ID
            // ==================================================

            if (
                !mongoose.Types.ObjectId.isValid(
                    donorId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid donor ID"
                });
            }


            // ==================================================
            // FIND DONOR
            // ==================================================

            const donor =
                await User.findById(
                    donorId
                );

            if (!donor) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Donor user not found in database"
                });
            }


            // ==================================================
            // LOCATION → COORDINATES
            // ==================================================

            let finalLatitude =
                latitude !== undefined &&
                latitude !== ""
                    ? Number(latitude)
                    : null;

            let finalLongitude =
                longitude !== undefined &&
                longitude !== ""
                    ? Number(longitude)
                    : null;


            // ==================================================
            // IF COORDINATES NOT PROVIDED
            // GEOCODE LOCATION
            // ==================================================

            if (
                !Number.isFinite(
                    finalLatitude
                ) ||
                !Number.isFinite(
                    finalLongitude
                )
            ) {

                console.log(
                    "Coordinates not provided."
                );

                console.log(
                    "Geocoding location..."
                );

                const geocoded =
                    await geocodeLocation(
                        location
                    );

                if (geocoded) {

                    finalLatitude =
                        geocoded.latitude;

                    finalLongitude =
                        geocoded.longitude;

                    console.log(
                        "Coordinates obtained automatically."
                    );

                } else {

                    console.log(
                        "Unable to geocode location."
                    );

                    return res.status(400).json({

                        success: false,

                        message:
                            "Could not find this location. Please enter a more specific location."
                    });
                }
            }


            // ==================================================
            // CREATE FOOD
            // ==================================================

            const food =
                await Food.create({

                    donorId:
                        donor._id,

                    foodName:
                        foodName.trim(),

                    foodType,

                    quantity:
                        Number(quantity),

                    unit,

                    description:
                        description || "",

                    location:
                        location.trim(),

                    latitude:
                        finalLatitude,

                    longitude:
                        finalLongitude,

                    expiryTime:
                        new Date(
                            expiryTime
                        ),

                    status:
                        "available"
                });


            console.log(
                "FOOD CREATED:",
                food._id.toString()
            );

            console.log(
                "Saved Latitude:",
                finalLatitude
            );

            console.log(
                "Saved Longitude:",
                finalLongitude
            );


            res.status(201).json({

                success: true,

                message:
                    "Surplus food added successfully",

                food
            });


        } catch (error) {

            console.log(
                "ADD FOOD ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    error.message ||
                    "Failed to add surplus food"
            });
        }
    }
);


// ==================================================
// GET AVAILABLE FOOD
// ==================================================

app.get(
    "/api/food",
    async (req, res) => {

        try {

            await Food.updateMany(
                {
                    status:
                        "available",

                    expiryTime: {
                        $lt:
                            new Date()
                    }
                },

                {
                    $set: {
                        status:
                            "expired"
                    }
                }
            );


            const foods =
                await Food
                    .find({
                        status:
                            "available"
                    })
                    .populate(
                        "donorId",
                        "name email phone address"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            const formattedFoods =
                foods.map(
                    food => {

                        const data =
                            food.toObject();

                        return {

                            ...data,

                            donorPhone:
                                food.donorId?.phone ||
                                "",

                            donorAddress:
                                food.donorId?.address ||
                                "",

                            donorName:
                                food.donorId?.name ||
                                "",

                            donorEmail:
                                food.donorId?.email ||
                                "",

                            mapsUrl:
                                food.location
                                    ? "https://www.google.com/maps/search/?api=1&query=" +
                                      encodeURIComponent(
                                          food.location
                                      )
                                    : ""
                        };

                    }
                );


            res.json({

                success:
                    true,

                count:
                    formattedFoods.length,

                foods:
                    formattedFoods
            });


        } catch (error) {

            console.log(
                "Get food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch available food"
            });
        }
    }
);


// ==================================================
// ROUTE / DISTANCE API
//
// FRONTEND SENDS:
//
// {
//   originLatitude,
//   originLongitude,
//   destinationLatitude,
//   destinationLongitude
// }
//
// RETURNS:
//
// distanceKm
// travelTime
// ==================================================

app.get(
    "/api/route",
    async (req, res) => {

        try {

            const {
                originLatitude,
                originLongitude,
                destinationLatitude,
                destinationLongitude
            } = req.query;


            if (
                originLatitude === undefined ||
                originLongitude === undefined ||
                destinationLatitude === undefined ||
                destinationLongitude === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Origin and destination coordinates are required"
                });
            }


            const route =
                await getRoadRoute(

                    Number(
                        originLatitude
                    ),

                    Number(
                        originLongitude
                    ),

                    Number(
                        destinationLatitude
                    ),

                    Number(
                        destinationLongitude
                    )
                );


            if (!route) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Unable to calculate road route"
                });
            }


            res.json({

                success:
                    true,

                route
            });


        } catch (error) {

            console.log(
                "Route API error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to calculate route"
            });
        }
    }
);


// ==================================================
// GET FOOD + ROUTE
//
// USER LOCATION → FOOD LOCATION
//
// Query:
//
// ?latitude=
// &longitude=
// ==================================================

app.get(
    "/api/food/:id/route",
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.query;


            if (
                latitude === undefined ||
                longitude === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Your current latitude and longitude are required"
                });
            }


            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid food ID"
                });
            }


            const food =
                await Food.findById(
                    req.params.id
                );


            if (!food) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Food not found"
                });
            }


            if (
                !Number.isFinite(
                    Number(food.latitude)
                ) ||
                !Number.isFinite(
                    Number(food.longitude)
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Food location coordinates are not available"
                });
            }


            const route =
                await getRoadRoute(

                    Number(
                        latitude
                    ),

                    Number(
                        longitude
                    ),

                    Number(
                        food.latitude
                    ),

                    Number(
                        food.longitude
                    )
                );


            if (!route) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Unable to calculate route"
                });
            }


            res.json({

                success:
                    true,

                foodId:
                    food._id,

                origin: {

                    latitude:
                        Number(
                            latitude
                        ),

                    longitude:
                        Number(
                            longitude
                        )
                },

                destination: {

                    latitude:
                        Number(
                            food.latitude
                        ),

                    longitude:
                        Number(
                            food.longitude
                        )
                },

                route
            });


        } catch (error) {

            console.log(
                "Food route error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to calculate food route"
            });
        }
    }
);


// ==================================================
// GET ALL FOOD - ADMIN
// ==================================================

app.get(
    "/api/admin/food",
    async (req, res) => {

        try {

            const foods =
                await Food
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
                        createdAt:
                            -1
                    });

            res.json({

                success:
                    true,

                count:
                    foods.length,

                foods
            });

        } catch (error) {

            console.log(
                "Admin food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch all food"
            });
        }
    }
);


// ==================================================
// GET FOOD BY ID
// ==================================================

app.get(
    "/api/food/:id",
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid food ID"
                });
            }


            const food =
                await Food
                    .findById(
                        req.params.id
                    )
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

                    success:
                        false,

                    message:
                        "Food not found"
                });
            }


            const foodData = {

                ...food.toObject(),

                donorPhone:
                    food.donorId?.phone ||
                    "",

                donorName:
                    food.donorId?.name ||
                    "",

                donorEmail:
                    food.donorId?.email ||
                    "",

                donorAddress:
                    food.donorId?.address ||
                    "",

                receiverPhone:
                    food.claimedBy?.phone ||
                    "",

                receiverName:
                    food.claimedBy?.name ||
                    "",

                receiverEmail:
                    food.claimedBy?.email ||
                    "",

                receiverAddress:
                    food.claimedBy?.address ||
                    "",

                mapsUrl:
                    food.location
                        ? "https://www.google.com/maps/search/?api=1&query=" +
                          encodeURIComponent(
                              food.location
                          )
                        : ""
            };


            res.json({

                success:
                    true,

                food:
                    foodData
            });


        } catch (error) {

            console.log(
                "Get food by ID error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to fetch food"
            });
        }
    }
);


// ==================================================
// GET FOOD BY DONOR
// ==================================================

app.get(
    "/api/food/donor/:donorId",
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.donorId
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid donor ID"
                });
            }


            const foods =
                await Food
                    .find({
                        donorId:
                            req.params.donorId
                    })
                    .populate(
                        "claimedBy",
                        "name email phone address"
                    )
                    .sort({
                        createdAt:
                            -1
                    });


            res.json({

                success:
                    true,

                count:
                    foods.length,

                foods
            });


        } catch (error) {

            console.log(
                "Get donor food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

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

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.receiverId
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid receiver ID"
                });
            }


            const foods =
                await Food
                    .find({
                        claimedBy:
                            req.params.receiverId
                    })
                    .populate(
                        "donorId",
                        "name email phone address"
                    )
                    .sort({
                        claimedAt:
                            -1
                    });


            res.json({

                success:
                    true,

                count:
                    foods.length,

                foods
            });


        } catch (error) {

            console.log(
                "Get receiver food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

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

                    success:
                        false,

                    message:
                        "User ID is required"
                });
            }


            if (
                !mongoose.Types.ObjectId.isValid(
                    receiverId
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid receiver ID"
                });
            }


            const receiver =
                await User.findById(
                    receiverId
                );


            if (!receiver) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Valid user not found"
                });
            }


            const food =
                await Food.findOne({

                    _id:
                        req.params.id,

                    status:
                        "available"
                });


            if (!food) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Food is not available or already claimed"
                });
            }


            if (
                new Date(
                    food.expiryTime
                ) < new Date()
            ) {

                food.status =
                    "expired";

                await food.save();


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "This food has expired"
                });
            }


            if (
                food.donorId.toString() ===
                receiverId.toString()
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "You cannot claim your own donated food"
                });
            }


            food.claimedBy =
                receiverId;

            food.claimedAt =
                new Date();

            food.status =
                "claimed";


            await food.save();


            const updatedFood =
                await Food
                    .findById(
                        food._id
                    )
                    .populate(
                        "donorId",
                        "name email phone address"
                    )
                    .populate(
                        "claimedBy",
                        "name email phone address"
                    );


            res.json({

                success:
                    true,

                message:
                    "Food claimed successfully",

                food:
                    updatedFood
            });


        } catch (error) {

            console.log(
                "Claim food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to claim food"
            });
        }
    }
);


// ==================================================
// CANCEL FOOD
// ==================================================

app.put(
    "/api/food/:id/cancel",
    async (req, res) => {

        try {

            const {
                userId
            } = req.body;


            const food =
                await Food.findById(
                    req.params.id
                );


            if (!food) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Food not found"
                });
            }


            if (
                !userId ||
                food.donorId.toString() !==
                userId.toString()
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "Only the food donor can cancel this food"
                });
            }


            if (
                food.status !==
                "available"
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Only available food can be cancelled"
                });
            }


            food.status =
                "cancelled";

            food.cancelledAt =
                new Date();


            await food.save();


            res.json({

                success:
                    true,

                message:
                    "Food cancelled successfully",

                food
            });


        } catch (error) {

            console.log(
                "Cancel food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to cancel food"
            });
        }
    }
);


// ==================================================
// MARK FOOD AS DISTRIBUTED
// ==================================================

app.put(
    "/api/food/:id/distribute",
    async (req, res) => {

        try {

            const {
                userId
            } = req.body;


            const food =
                await Food.findById(
                    req.params.id
                );


            if (!food) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Food not found"
                });
            }


            if (
                !userId ||
                food.donorId.toString() !==
                userId.toString()
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "Only the donor can mark food as distributed"
                });
            }


            if (
                food.status !==
                "claimed"
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Food must be claimed before distribution"
                });
            }


            food.status =
                "distributed";


            await food.save();


            const updatedFood =
                await Food
                    .findById(
                        food._id
                    )
                    .populate(
                        "donorId",
                        "name email phone address"
                    )
                    .populate(
                        "claimedBy",
                        "name email phone address"
                    );


            res.json({

                success:
                    true,

                message:
                    "Food marked as distributed",

                food:
                    updatedFood
            });


        } catch (error) {

            console.log(
                "Distribute food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to mark food as distributed"
            });
        }
    }
);


// ==================================================
// UPDATE FOOD
// ==================================================

app.put(
    "/api/food/:id",
    async (req, res) => {

        try {

            const {
                foodName,
                foodType,
                quantity,
                unit,
                description,
                location,
                latitude,
                longitude,
                expiryTime,
                status
            } = req.body;


            const updateData = {};


            if (
                foodName !== undefined
            )
                updateData.foodName =
                    foodName.trim();


            if (
                foodType !== undefined
            )
                updateData.foodType =
                    foodType;


            if (
                quantity !== undefined
            )
                updateData.quantity =
                    Number(quantity);


            if (
                unit !== undefined
            )
                updateData.unit =
                    unit;


            if (
                description !== undefined
            )
                updateData.description =
                    description;


            // ==================================================
            // IMPORTANT:
            // IF LOCATION CHANGES,
            // AUTOMATICALLY GEOCODE AGAIN
            // ==================================================

            if (
                location !== undefined
            ) {

                const cleanLocation =
                    location.trim();

                updateData.location =
                    cleanLocation;


                const geocoded =
                    await geocodeLocation(
                        cleanLocation
                    );


                if (geocoded) {

                    updateData.latitude =
                        geocoded.latitude;

                    updateData.longitude =
                        geocoded.longitude;

                } else {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            "Could not find the updated location"
                    });
                }
            }


            // ==================================================
            // IF LATITUDE/LONGITUDE EXPLICITLY SENT
            // ==================================================

            if (
                location === undefined &&
                latitude !== undefined
            ) {

                updateData.latitude =
                    latitude === ""
                        ? null
                        : Number(latitude);
            }


            if (
                location === undefined &&
                longitude !== undefined
            ) {

                updateData.longitude =
                    longitude === ""
                        ? null
                        : Number(longitude);
            }


            if (
                expiryTime !== undefined
            )
                updateData.expiryTime =
                    new Date(
                        expiryTime
                    );


            if (
                status !== undefined
            )
                updateData.status =
                    status;


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

                    success:
                        false,

                    message:
                        "Food not found"
                });
            }


            res.json({

                success:
                    true,

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

                success:
                    false,

                message:
                    "Failed to update food"
            });
        }
    }
);


// ==================================================
// DELETE FOOD
// ==================================================

app.delete(
    "/api/food/:id",
    async (req, res) => {

        try {

            const food =
                await Food.findByIdAndDelete(
                    req.params.id
                );


            if (!food) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Food not found"
                });
            }


            res.json({

                success:
                    true,

                message:
                    "Food deleted successfully"
            });


        } catch (error) {

            console.log(
                "Delete food error:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Failed to delete food"
            });
        }
    }
);


// ==================================================
// ADMIN DASHBOARD STATISTICS
// ==================================================

app.get(
    "/api/admin/stats",
    async (req, res) => {

        try {

            await Food.updateMany(

                {
                    status:
                        "available",

                    expiryTime: {
                        $lt:
                            new Date()
                    }
                },

                {
                    $set: {
                        status:
                            "expired"
                    }
                }
            );


            const totalUsers =
                await User.countDocuments();


            const totalDonors =
                await User.countDocuments({
                    role:
                        "donor"
                });


            const totalReceivers =
                await User.countDocuments({
                    role:
                        "receiver"
                });


            const totalAdmins =
                await User.countDocuments({
                    role:
                        "admin"
                });


            const totalFood =
                await Food.countDocuments();


            const availableFood =
                await Food.countDocuments({
                    status:
                        "available"
                });


            const claimedFood =
                await Food.countDocuments({
                    status:
                        "claimed"
                });


            const cancelledFood =
                await Food.countDocuments({
                    status:
                        "cancelled"
                });


            const expiredFood =
                await Food.countDocuments({
                    status:
                        "expired"
                });


            const distributedFood =
                await Food.countDocuments({
                    status:
                        "distributed"
                });


            res.json({

                success:
                    true,

                stats: {

                    totalUsers,

                    totalDonors,

                    totalReceivers,

                    totalAdmins,

                    totalFood,

                    availableFood,

                    claimedFood,

                    cancelledFood,

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

                success:
                    false,

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


app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

    }
);