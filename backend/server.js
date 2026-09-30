const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const User = require("./models/User");
const Food = require("./models/Food");
const Notification = require("./models/Notification");
const Rating = require("./models/Rating");

const app = express();

// ==================================================
// BASIC CONFIG
// ==================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

// ==================================================
// CONFIG
// ==================================================

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "food_surplus_secret";

// ==================================================
// MONGODB CONNECTION
// ==================================================

mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2
    })
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
// HELPER - VALID OBJECT ID
// ==================================================

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

// ==================================================
// HELPER - CREATE NOTIFICATION
// ==================================================

async function createNotification({
    userId,
    title,
    message,
    type = "system",
    foodId = null
}) {
    try {
        if (!userId) {
            return null;
        }

        return await Notification.create({
            userId,
            title,
            message,
            type,
            foodId
        });
    } catch (error) {
        console.log(
            "Notification error:",
            error.message
        );

        return null;
    }
}

// ==================================================
// GEOCODING - NOMINATIM
// IMPROVED LOCATION SEARCH
// ==================================================

async function geocodeLocation(location) {
    try {
        if (
            !location ||
            !String(location).trim()
        ) {
            return null;
        }

        const originalLocation =
            String(location).trim();

        // Try multiple search formats
        const searchQueries = [];

        // 1. Exact user input
        searchQueries.push(
            originalLocation
        );

        // 2. Add India
        if (
            !originalLocation
                .toLowerCase()
                .includes("india")
        ) {
            searchQueries.push(
                `${originalLocation}, India`
            );
        }

        // 3. Andhra Pradesh fallback
        // Only as a fallback, NOT forced for every location
        const lower =
            originalLocation.toLowerCase();

        const likelyAndhraLocation =
            lower.includes("tuni") ||
            lower.includes("rajahmundry") ||
            lower.includes("rajahmahendravaram") ||
            lower.includes("vijayawada") ||
            lower.includes("visakhapatnam") ||
            lower.includes("vizag") ||
            lower.includes("kakinada") ||
            lower.includes("tirupati") ||
            lower.includes("nellore") ||
            lower.includes("guntur") ||
            lower.includes("eluru") ||
            lower.includes("kadapa") ||
            lower.includes("anantapur") ||
            lower.includes("kurnool");

        if (
            likelyAndhraLocation &&
            !lower.includes("andhra pradesh")
        ) {
            searchQueries.push(
                `${originalLocation}, Andhra Pradesh, India`
            );
        }

        for (
            const searchQuery of searchQueries
        ) {
            try {
                const query =
                    encodeURIComponent(
                        searchQuery
                    );

                const url =
                    "https://nominatim.openstreetmap.org/search" +
                    "?format=jsonv2" +
                    "&addressdetails=1" +
                    "&limit=5" +
                    "&countrycodes=in" +
                    "&accept-language=en" +
                    "&q=" +
                    query;

                console.log(
                    "Trying location:",
                    searchQuery
                );

                const response =
                    await fetch(url, {
                        headers: {
                            "User-Agent":
                                "FoodSurplusSystem/1.0"
                        }
                    });

                if (!response.ok) {
                    console.log(
                        "Geocoding HTTP error:",
                        response.status
                    );

                    continue;
                }

                const results =
                    await response.json();

                if (
                    !Array.isArray(results) ||
                    results.length === 0
                ) {
                    continue;
                }

                // Prefer results that are actually in India
                const indiaResults =
                    results.filter(
                        (item) => {
                            const address =
                                item.address ||
                                {};

                            const country =
                                String(
                                    address.country ||
                                    ""
                                ).toLowerCase();

                            return (
                                country ===
                                    "india" ||
                                String(
                                    item.display_name ||
                                    ""
                                )
                                    .toLowerCase()
                                    .includes(
                                        "india"
                                    )
                            );
                        }
                    );

                const candidates =
                    indiaResults.length > 0
                        ? indiaResults
                        : results;

                // For Andhra locations, prefer Andhra Pradesh
                let selected =
                    candidates[0];

                if (
                    likelyAndhraLocation
                ) {
                    const andhraResult =
                        candidates.find(
                            (item) => {
                                const address =
                                    item.address ||
                                    {};

                                return String(
                                    address.state ||
                                    ""
                                )
                                    .toLowerCase()
                                    .includes(
                                        "andhra pradesh"
                                    );
                            }
                        );

                    if (
                        andhraResult
                    ) {
                        selected =
                            andhraResult;
                    }
                }

                const latitude =
                    Number(
                        selected.lat
                    );

                const longitude =
                    Number(
                        selected.lon
                    );

                if (
                    !Number.isFinite(
                        latitude
                    ) ||
                    !Number.isFinite(
                        longitude
                    )
                ) {
                    continue;
                }

                console.log(
                    "Location found:",
                    selected.display_name
                );

                return {
                    latitude,
                    longitude,
                    displayName:
                        selected.display_name ||
                        originalLocation
                };
            } catch (searchError) {
                console.log(
                    "Location search error:",
                    searchError.message
                );
            }
        }

        console.log(
            "Could not geocode location:",
            originalLocation
        );

        return null;
    } catch (error) {
        console.log(
            "Geocoding error:",
            error.message
        );

        return null;
    }
}

// ==================================================
// ROAD ROUTE - OSRM
// ==================================================

async function getRoadRoute(
    originLatitude,
    originLongitude,
    destinationLatitude,
    destinationLongitude
) {
    try {
        const originLat =
            Number(originLatitude);

        const originLon =
            Number(originLongitude);

        const destinationLat =
            Number(destinationLatitude);

        const destinationLon =
            Number(destinationLongitude);

        if (
            !Number.isFinite(originLat) ||
            !Number.isFinite(originLon) ||
            !Number.isFinite(destinationLat) ||
            !Number.isFinite(destinationLon)
        ) {
            return null;
        }

        if (
            originLat < -90 ||
            originLat > 90 ||
            destinationLat < -90 ||
            destinationLat > 90 ||
            originLon < -180 ||
            originLon > 180 ||
            destinationLon < -180 ||
            destinationLon > 180
        ) {
            return null;
        }

        const coordinates =
            `${originLon},${originLat};${destinationLon},${destinationLat}`;

        const url =
            "https://router.project-osrm.org/route/v1/driving/" +
            coordinates +
            "?overview=false&alternatives=false";

        const controller =
            new AbortController();

        const timeout =
            setTimeout(() => {
                controller.abort();
            }, 30000);

        let response;

        try {
            response =
                await fetch(url, {
                    signal:
                        controller.signal,

                    headers: {
                        "Accept":
                            "application/json",
                        "User-Agent":
                            "FoodSurplusSystem/1.0"
                    }
                });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            console.log(
                "OSRM routing failed:",
                response.status
            );

            return null;
        }

        const data =
            await response.json();

        if (
            data.code !== "Ok" ||
            !Array.isArray(
                data.routes
            ) ||
            data.routes.length === 0
        ) {
            return null;
        }

        const route =
            data.routes[0];

        const distanceMeters =
            Number(route.distance);

        const durationSeconds =
            Number(route.duration);

        if (
            !Number.isFinite(
                distanceMeters
            ) ||
            !Number.isFinite(
                durationSeconds
            )
        ) {
            return null;
        }

        const distanceKm =
            distanceMeters / 1000;

        const durationMinutes =
            Math.ceil(
                durationSeconds / 60
            );

        let travelTime;

        if (durationMinutes < 60) {
            travelTime =
                durationMinutes +
                " mins";
        } else {
            const hours =
                Math.floor(
                    durationMinutes / 60
                );

            const minutes =
                durationMinutes % 60;

            if (minutes === 0) {
                travelTime =
                    hours +
                    " hr";
            } else {
                travelTime =
                    hours +
                    " hr " +
                    minutes +
                    " mins";
            }
        }

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

            travelTime
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
// HAVERSINE DISTANCE
// ==================================================

function calculateStraightDistance(
    latitude1,
    longitude1,
    latitude2,
    longitude2
) {
    const lat1 =
        Number(latitude1);

    const lon1 =
        Number(longitude1);

    const lat2 =
        Number(latitude2);

    const lon2 =
        Number(longitude2);

    if (
        !Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2)
    ) {
        return null;
    }

    const earthRadiusKm = 6371;

    const dLat =
        ((lat2 - lat1) *
            Math.PI) /
        180;

    const dLon =
        ((lon2 - lon1) *
            Math.PI) /
        180;

    const a =
        Math.sin(dLat / 2) *
            Math.sin(dLat / 2) +
        Math.cos(
            (lat1 * Math.PI) /
                180
        ) *
            Math.cos(
                (lat2 * Math.PI) /
                    180
            ) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return Number(
        (
            earthRadiusKm * c
        ).toFixed(2)
    );
}

// ==================================================
// FORMAT FOOD
// ==================================================

function formatFood(food) {
    if (!food) {
        return null;
    }

    return {
        ...food,

        donorPhone:
            food.donorId?.phone || "",

        donorAddress:
            food.donorId?.address || "",

        donorName:
            food.donorId?.name || "",

        donorEmail:
            food.donorId?.email || "",

        receiverPhone:
            food.claimedBy?.phone || "",

        receiverAddress:
            food.claimedBy?.address || "",

        receiverName:
            food.claimedBy?.name || "",

        receiverEmail:
            food.claimedBy?.email || "",

        mapsUrl:
            food.location
                ? "https://www.google.com/maps/search/?api=1&query=" +
                  encodeURIComponent(
                      food.location
                  )
                : ""
    };
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

            if (
                password.length < 6
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must contain at least 6 characters"
                });
            }

            const normalizedEmail =
                email
                    .toLowerCase()
                    .trim();

            const existingUser =
                await User.findOne({
                    email:
                        normalizedEmail
                }).lean();

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
                "user",
                "donor",
                "receiver",
                "admin"
            ];

            const userRole =
                allowedRoles.includes(role)
                    ? role
                    : "user";

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

            return res.status(201).json({
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

            return res.status(500).json({
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
                email
                    .toLowerCase()
                    .trim();

            const user =
                await User.findOne({
                    email:
                        normalizedEmail
                })
                    .select(
                        "_id name email phone address password role"
                    )
                    .lean();

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

            return res.json({
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

            return res.status(500).json({
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
                    })
                    .lean();

            return res.json({
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

            return res.status(500).json({
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
                !isValidObjectId(
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
                    .select("-password")
                    .lean();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }

            return res.json({
                success: true,
                user
            });
        } catch (error) {
            console.log(
                "Get user error:",
                error.message
            );

            return res.status(500).json({
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
            if (
                !isValidObjectId(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });
            }

            const {
                name,
                email,
                phone,
                address,
                password,
                role
            } = req.body;

            const updateData = {};

            if (name !== undefined) {
                updateData.name =
                    String(name).trim();
            }

            if (email !== undefined) {
                updateData.email =
                    String(email)
                        .toLowerCase()
                        .trim();
            }

            if (phone !== undefined) {
                updateData.phone =
                    String(phone).trim();
            }

            if (address !== undefined) {
                updateData.address =
                    String(address).trim();
            }

            if (role !== undefined) {
                updateData.role =
                    role;
            }

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
                    .select("-password")
                    .lean();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found"
                });
            }

            return res.json({
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

            return res.status(500).json({
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
            if (
                !isValidObjectId(
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

            return res.json({
                success: true,
                message:
                    "User deleted successfully"
            });
        } catch (error) {
            console.log(
                "Delete user error:",
                error.message
            );

            return res.status(500).json({
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

            if (
                !isValidObjectId(
                    donorId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid donor ID"
                });
            }

            const donor =
                await User.findById(
                    donorId
                ).lean();

            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Donor user not found"
                });
            }

            /*
             * IMPORTANT:
             * Always geocode location text while
             * creating food.
             */

            const geocoded =
                await geocodeLocation(
                    location
                );

            if (!geocoded) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Could not find this location. Please enter a more specific location."
                });
            }

            const finalLatitude =
                geocoded.latitude;

            const finalLongitude =
                geocoded.longitude;

            const finalExpiry =
                new Date(expiryTime);

            if (
                Number.isNaN(
                    finalExpiry.getTime()
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid expiry time"
                });
            }

            if (
                finalExpiry <= new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Expiry time must be in the future"
                });
            }

            const food =
                await Food.create({
                    donorId:
                        donor._id,

                    foodName:
                        foodName.trim(),

                    foodType:
                        foodType.trim(),

                    quantity:
                        Number(quantity),

                    unit:
                        unit.trim(),

                    description:
                        description || "",

                    location:
                        location.trim(),

                    latitude:
                        finalLatitude,

                    longitude:
                        finalLongitude,

                    expiryTime:
                        finalExpiry,

                    status:
                        "available"
                });

            console.log(
                "Food created:",
                food.foodName,
                food.location,
                food.latitude,
                food.longitude
            );

            return res.status(201).json({
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

            return res.status(500).json({
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
            const {
                search,
                foodType,
                latitude,
                longitude,
                maxDistance,
                sort
            } = req.query;

            const now =
                new Date();

            await Food.updateMany(
                {
                    status:
                        "available",

                    expiryTime: {
                        $lt: now
                    }
                },
                {
                    $set: {
                        status:
                            "expired"
                    }
                }
            );

            const filter = {
                status:
                    "available"
            };

            if (
                search &&
                search.trim()
            ) {
                filter.foodName = {
                    $regex:
                        search.trim(),
                    $options:
                        "i"
                };
            }

            if (
                foodType &&
                foodType.trim() &&
                foodType.toLowerCase() !==
                    "all"
            ) {
                filter.foodType = {
                    $regex:
                        foodType.trim(),
                    $options:
                        "i"
                };
            }

            let foods =
                await Food
                    .find(filter)
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
                    })
                    .lean();

            /*
             * Keep this distance only for search/filter.
             * Frontend displayed distance uses the
             * dedicated OSRM road route endpoint.
             */

            if (
                latitude !== undefined &&
                longitude !== undefined &&
                Number.isFinite(
                    Number(latitude)
                ) &&
                Number.isFinite(
                    Number(longitude)
                )
            ) {
                foods =
                    foods.map((food) => {
                        const distance =
                            calculateStraightDistance(
                                latitude,
                                longitude,
                                food.latitude,
                                food.longitude
                            );

                        return {
                            ...food,
                            distanceKm:
                                distance
                        };
                    });

                if (
                    maxDistance !==
                        undefined &&
                    Number.isFinite(
                        Number(maxDistance)
                    )
                ) {
                    const maximum =
                        Number(
                            maxDistance
                        );

                    foods =
                        foods.filter(
                            (food) =>
                                food.distanceKm !==
                                    null &&
                                food.distanceKm <=
                                    maximum
                        );
                }

                if (
                    sort ===
                    "nearest"
                ) {
                    foods.sort(
                        (a, b) =>
                            (a.distanceKm ??
                                Infinity) -
                            (b.distanceKm ??
                                Infinity)
                    );
                }
            }

            return res.json({
                success: true,

                count:
                    foods.length,

                foods:
                    foods.map(
                        (food) =>
                            formatFood(food)
                    )
            });
        } catch (error) {
            console.log(
                "Get food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch available food"
            });
        }
    }
);

// ==================================================
// NEARBY FOOD
// ==================================================

app.get(
    "/api/food/nearby",
    async (req, res) => {
        try {
            const {
                latitude,
                longitude,
                maxDistance = 10
            } = req.query;

            if (
                latitude === undefined ||
                longitude === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Latitude and longitude are required"
                });
            }

            const userLatitude =
                Number(latitude);

            const userLongitude =
                Number(longitude);

            const maximumDistance =
                Number(maxDistance);

            if (
                !Number.isFinite(
                    userLatitude
                ) ||
                !Number.isFinite(
                    userLongitude
                ) ||
                !Number.isFinite(
                    maximumDistance
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid coordinates or distance"
                });
            }

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
                    .lean();

            const nearbyFoods =
                foods
                    .map((food) => {
                        const distance =
                            calculateStraightDistance(
                                userLatitude,
                                userLongitude,
                                food.latitude,
                                food.longitude
                            );

                        return {
                            ...food,
                            distanceKm:
                                distance
                        };
                    })
                    .filter(
                        (food) =>
                            food.distanceKm !==
                                null &&
                            food.distanceKm <=
                                maximumDistance
                    )
                    .sort(
                        (a, b) =>
                            a.distanceKm -
                            b.distanceKm
                    )
                    .map(
                        (food) =>
                            formatFood(food)
                    );

            return res.json({
                success: true,

                count:
                    nearbyFoods.length,

                maxDistance:
                    maximumDistance,

                foods:
                    nearbyFoods
            });
        } catch (error) {
            console.log(
                "Nearby food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch nearby food"
            });
        }
    }
);

// ==================================================
// ROUTE API
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

            return res.json({
                success: true,
                route
            });
        } catch (error) {
            console.log(
                "Route API error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to calculate route"
            });
        }
    }
);

// ==================================================
// FOOD ROUTE - IMPORTANT
// ==================================================

app.get(
    "/api/food/:id/route",
    async (req, res) => {
        try {
            const {
                latitude,
                longitude
            } = req.query;

            const userLatitude =
                Number(latitude);

            const userLongitude =
                Number(longitude);

            if (
                !Number.isFinite(
                    userLatitude
                ) ||
                !Number.isFinite(
                    userLongitude
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Your current location could not be detected"
                });
            }

            if (
                !isValidObjectId(
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
                ).lean();

            if (!food) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Food not found"
                });
            }

            /*
             * VERY IMPORTANT:
             *
             * Do NOT trust old saved latitude/
             * longitude.
             *
             * Get fresh coordinates from the
             * actual location text.
             */

            const foodCoordinates =
                await ensureFoodCoordinates(
                    food
                );

            if (!foodCoordinates) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Could not identify the food location. Please enter a more specific location."
                });
            }

            const route =
                await getRoadRoute(
                    userLatitude,
                    userLongitude,

                    foodCoordinates.latitude,
                    foodCoordinates.longitude
                );

            if (!route) {
                return res.status(503).json({
                    success: false,
                    message:
                        "Road distance is temporarily unavailable"
                });
            }

            console.log(
                "ROAD ROUTE:",
                food.location,
                "| USER:",
                userLatitude,
                userLongitude,
                "| FOOD:",
                foodCoordinates.latitude,
                foodCoordinates.longitude,
                "| DISTANCE:",
                route.distanceKm,
                "KM",
                "| TIME:",
                route.travelTime
            );

            return res.json({
                success: true,

                foodId:
                    food._id,

                foodLocation:
                    food.location,

                origin: {
                    latitude:
                        userLatitude,

                    longitude:
                        userLongitude
                },

                destination: {
                    latitude:
                        foodCoordinates.latitude,

                    longitude:
                        foodCoordinates.longitude
                },

                route: {
                    distanceKm:
                        route.distanceKm,

                    distanceMeters:
                        route.distanceMeters,

                    durationMinutes:
                        route.durationMinutes,

                    durationSeconds:
                        route.durationSeconds,

                    travelTime:
                        route.travelTime
                }
            });
        } catch (error) {
            console.log(
                "Food route error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to calculate food route"
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
                !isValidObjectId(
                    req.params.donorId
                )
            ) {
                return res.status(400).json({
                    success: false,
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
                        createdAt: -1
                    })
                    .lean();

            return res.json({
                success: true,

                count:
                    foods.length,

                foods:
                    foods.map(
                        (food) =>
                            formatFood(food)
                    )
            });
        } catch (error) {
            console.log(
                "Get donor food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch donor food"
            });
        }
    }
);

// ==================================================
// GET FOOD BY RECEIVER
// ==================================================

app.get(
    "/api/food/receiver/:receiverId",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.receiverId
                )
            ) {
                return res.status(400).json({
                    success: false,
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
                        claimedAt: -1
                    })
                    .lean();

            return res.json({
                success: true,

                count:
                    foods.length,

                foods:
                    foods.map(
                        (food) =>
                            formatFood(food)
                    )
            });
        } catch (error) {
            console.log(
                "Get receiver food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch claimed food"
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
                !isValidObjectId(
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
                    )
                    .lean();

            if (!food) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Food not found"
                });
            }

            return res.json({
                success: true,

                food:
                    formatFood(food)
            });
        } catch (error) {
            console.log(
                "Get food by ID error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch food"
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
                        "User ID is required"
                });
            }

            if (
                !isValidObjectId(
                    receiverId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid receiver ID"
                });
            }

            if (
                !isValidObjectId(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid food ID"
                });
            }

            const receiver =
                await User.findById(
                    receiverId
                ).lean();

            if (!receiver) {
                return res.status(404).json({
                    success: false,
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
                    success: false,
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
                    success: false,
                    message:
                        "This food has expired"
                });
            }

            if (
                food.donorId.toString() ===
                receiverId.toString()
            ) {
                return res.status(400).json({
                    success: false,
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

            await createNotification({
                userId:
                    food.donorId,

                title:
                    "New Food Claim",

                message:
                    `${food.foodName} has been claimed by ${receiver.name}.`,

                type:
                    "claim",

                foodId:
                    food._id
            });

            await createNotification({
                userId:
                    receiverId,

                title:
                    "Food Claim Successful",

                message:
                    `Your claim for ${food.foodName} was successful.`,

                type:
                    "claim",

                foodId:
                    food._id
            });

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
                    )
                    .lean();

            return res.json({
                success: true,

                message:
                    "Food claimed successfully",

                food:
                    formatFood(
                        updatedFood
                    )
            });
        } catch (error) {
            console.log(
                "Claim food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to claim food"
            });
        }
    }
);

// ==================================================
// PICK UP FOOD
// ==================================================

app.put(
    "/api/food/:id/pickup",
    async (req, res) => {
        try {
            const {
                userId
            } = req.body;

            if (
                !userId ||
                !isValidObjectId(userId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid user ID is required"
                });
            }

            if (
                !isValidObjectId(
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
                !food.claimedBy ||
                food.claimedBy.toString() !==
                    userId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only the receiver who claimed this food can mark it as picked up"
                });
            }

            if (
                food.status !==
                "claimed"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only claimed food can be picked up"
                });
            }

            food.status =
                "picked_up";

            food.pickedUpAt =
                new Date();

            await food.save();

            await createNotification({
                userId:
                    food.donorId,

                title:
                    "Food Picked Up",

                message:
                    `${food.foodName} has been picked up successfully.`,

                type:
                    "pickup",

                foodId:
                    food._id
            });

            await createNotification({
                userId:
                    food.claimedBy,

                title:
                    "Food Pickup Confirmed",

                message:
                    `You picked up ${food.foodName} successfully.`,

                type:
                    "pickup",

                foodId:
                    food._id
            });

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
                    )
                    .lean();

            return res.json({
                success: true,

                message:
                    "Food marked as picked up",

                food:
                    formatFood(
                        updatedFood
                    )
            });
        } catch (error) {
            console.log(
                "Pickup food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to mark food as picked up"
            });
        }
    }
);

// ==================================================
// COMPLETE FOOD
// ==================================================

app.put(
    "/api/food/:id/complete",
    async (req, res) => {
        try {
            const {
                userId
            } = req.body;

            if (
                !userId ||
                !isValidObjectId(userId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid user ID is required"
                });
            }

            if (
                !isValidObjectId(
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

            const isDonor =
                food.donorId.toString() ===
                userId.toString();

            const isReceiver =
                food.claimedBy &&
                food.claimedBy.toString() ===
                    userId.toString();

            if (
                !isDonor &&
                !isReceiver
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not authorized to complete this food donation"
                });
            }

            if (
                food.status !==
                    "picked_up" &&
                food.status !==
                    "distributed"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Food must be picked up before completion"
                });
            }

            food.status =
                "completed";

            food.completedAt =
                new Date();

            await food.save();

            if (food.donorId) {
                await createNotification({
                    userId:
                        food.donorId,

                    title:
                        "Donation Completed",

                    message:
                        `${food.foodName} donation has been completed.`,

                    type:
                        "completed",

                    foodId:
                        food._id
                });
            }

            if (food.claimedBy) {
                await createNotification({
                    userId:
                        food.claimedBy,

                    title:
                        "Food Completed",

                    message:
                        `${food.foodName} has been marked as completed.`,

                    type:
                        "completed",

                    foodId:
                        food._id
                });
            }

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
                    )
                    .lean();

            return res.json({
                success: true,

                message:
                    "Food marked as completed",

                food:
                    formatFood(
                        updatedFood
                    )
            });
        } catch (error) {
            console.log(
                "Complete food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to mark food as completed"
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

            if (
                !userId ||
                !isValidObjectId(userId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid user ID is required"
                });
            }

            if (
                !isValidObjectId(
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
                food.donorId.toString() !==
                userId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only the food donor can cancel this food"
                });
            }

            if (
                food.status !==
                "available"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only available food can be cancelled"
                });
            }

            food.status =
                "cancelled";

            food.cancelledAt =
                new Date();

            await food.save();

            return res.json({
                success: true,

                message:
                    "Food cancelled successfully",

                food
            });
        } catch (error) {
            console.log(
                "Cancel food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to cancel food"
            });
        }
    }
);

// ==================================================
// DISTRIBUTE FOOD
// ==================================================

app.put(
    "/api/food/:id/distribute",
    async (req, res) => {
        try {
            const {
                userId
            } = req.body;

            if (
                !userId ||
                !isValidObjectId(userId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid user ID is required"
                });
            }

            if (
                !isValidObjectId(
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
                food.donorId.toString() !==
                userId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only the donor can mark food as distributed"
                });
            }

            if (
                food.status !==
                "claimed"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Food must be claimed before distribution"
                });
            }

            food.status =
                "distributed";

            food.distributedAt =
                new Date();

            await food.save();

            await createNotification({
                userId:
                    food.claimedBy,

                title:
                    "Food Distributed",

                message:
                    `${food.foodName} has been marked as distributed.`,

                type:
                    "completed",

                foodId:
                    food._id
            });

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
                    )
                    .lean();

            return res.json({
                success: true,

                message:
                    "Food marked as distributed",

                food:
                    formatFood(
                        updatedFood
                    )
            });
        } catch (error) {
            console.log(
                "Distribute food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
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
            if (
                !isValidObjectId(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid food ID"
                });
            }

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
            ) {
                updateData.foodName =
                    String(
                        foodName
                    ).trim();
            }

            if (
                foodType !== undefined
            ) {
                updateData.foodType =
                    foodType;
            }

            if (
                quantity !== undefined
            ) {
                updateData.quantity =
                    Number(quantity);
            }

            if (
                unit !== undefined
            ) {
                updateData.unit =
                    unit;
            }

            if (
                description !== undefined
            ) {
                updateData.description =
                    description;
            }

            if (
                location !== undefined
            ) {
                const cleanLocation =
                    String(
                        location
                    ).trim();

                if (!cleanLocation) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Location cannot be empty"
                    });
                }

                updateData.location =
                    cleanLocation;

                const geocoded =
                    await geocodeLocation(
                        cleanLocation
                    );

                if (!geocoded) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Could not find the updated location"
                    });
                }

                updateData.latitude =
                    geocoded.latitude;

                updateData.longitude =
                    geocoded.longitude;
            }

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
            ) {
                const newExpiry =
                    new Date(
                        expiryTime
                    );

                if (
                    Number.isNaN(
                        newExpiry.getTime()
                    )
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid expiry time"
                    });
                }

                updateData.expiryTime =
                    newExpiry;
            }

            if (
                status !== undefined
            ) {
                updateData.status =
                    status;
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

            return res.json({
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

            return res.status(500).json({
                success: false,
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
            if (
                !isValidObjectId(
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

            await Notification.deleteMany({
                foodId:
                    food._id
            });

            await Rating.deleteMany({
                foodId:
                    food._id
            });

            return res.json({
                success: true,
                message:
                    "Food deleted successfully"
            });
        } catch (error) {
            console.log(
                "Delete food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to delete food"
            });
        }
    }
);

// ==================================================
// NOTIFICATIONS - GET
// ==================================================

app.get(
    "/api/notifications/:userId",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.userId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });
            }

            const notifications =
                await Notification
                    .find({
                        userId:
                            req.params.userId
                    })
                    .populate(
                        "foodId",
                        "foodName status"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            const unreadCount =
                notifications.filter(
                    (item) =>
                        !item.read
                ).length;

            return res.json({
                success: true,

                count:
                    notifications.length,

                unreadCount,

                notifications
            });
        } catch (error) {
            console.log(
                "Get notifications error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch notifications"
            });
        }
    }
);

// ==================================================
// NOTIFICATION - MARK ONE READ
// ==================================================

app.put(
    "/api/notifications/:id/read",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid notification ID"
                });
            }

            const notification =
                await Notification.findByIdAndUpdate(
                    req.params.id,
                    {
                        read:
                            true
                    },
                    {
                        new:
                            true
                    }
                ).lean();

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Notification not found"
                });
            }

            return res.json({
                success: true,

                message:
                    "Notification marked as read",

                notification
            });
        } catch (error) {
            console.log(
                "Read notification error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update notification"
            });
        }
    }
);

// ==================================================
// NOTIFICATIONS - MARK ALL READ
// ==================================================

app.put(
    "/api/notifications/:userId/read-all",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.userId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });
            }

            await Notification.updateMany(
                {
                    userId:
                        req.params.userId,

                    read:
                        false
                },
                {
                    $set: {
                        read:
                            true
                    }
                }
            );

            return res.json({
                success: true,

                message:
                    "All notifications marked as read"
            });
        } catch (error) {
            console.log(
                "Read all notifications error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update notifications"
            });
        }
    }
);

// ==================================================
// NOTIFICATIONS - DELETE
// ==================================================

app.delete(
    "/api/notifications/:id",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid notification ID"
                });
            }

            const notification =
                await Notification.findByIdAndDelete(
                    req.params.id
                );

            if (!notification) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Notification not found"
                });
            }

            return res.json({
                success: true,

                message:
                    "Notification deleted"
            });
        } catch (error) {
            console.log(
                "Delete notification error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to delete notification"
            });
        }
    }
);

// ==================================================
// RATINGS - CREATE
// ==================================================

app.post(
    "/api/ratings",
    async (req, res) => {
        try {
            const {
                foodId,
                fromUser,
                rating,
                feedback
            } = req.body;

            if (
                !foodId ||
                !fromUser ||
                rating === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Food ID, user ID and rating are required"
                });
            }

            if (
                !isValidObjectId(
                    foodId
                ) ||
                !isValidObjectId(
                    fromUser
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid food or user ID"
                });
            }

            const ratingValue =
                Number(rating);

            if (
                !Number.isInteger(
                    ratingValue
                ) ||
                ratingValue < 1 ||
                ratingValue > 5
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Rating must be between 1 and 5"
                });
            }

            const food =
                await Food.findById(
                    foodId
                );

            if (!food) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Food not found"
                });
            }

            const isDonor =
                food.donorId.toString() ===
                fromUser.toString();

            const isReceiver =
                food.claimedBy &&
                food.claimedBy.toString() ===
                    fromUser.toString();

            if (
                !isDonor &&
                !isReceiver
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not part of this food transaction"
                });
            }

            if (
                food.status !==
                    "completed" &&
                food.status !==
                    "distributed" &&
                food.status !==
                    "picked_up"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Rating is available after food pickup/completion"
                });
            }

            const toUser =
                isDonor
                    ? food.claimedBy
                    : food.donorId;

            if (!toUser) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The other user is not available for rating"
                });
            }

            const existingRating =
                await Rating.findOne({
                    foodId,
                    fromUser
                });

            if (existingRating) {
                return res.status(400).json({
                    success: false,
                    message:
                        "You have already rated this food transaction"
                });
            }

            const newRating =
                await Rating.create({
                    foodId,

                    fromUser,

                    toUser,

                    rating:
                        ratingValue,

                    feedback:
                        feedback || ""
                });

            await createNotification({
                userId:
                    toUser,

                title:
                    "New Rating Received",

                message:
                    `You received a ${ratingValue}/5 rating for ${food.foodName}.`,

                type:
                    "system",

                foodId:
                    food._id
            });

            const populatedRating =
                await Rating
                    .findById(
                        newRating._id
                    )
                    .populate(
                        "fromUser",
                        "name email"
                    )
                    .populate(
                        "toUser",
                        "name email"
                    )
                    .populate(
                        "foodId",
                        "foodName"
                    )
                    .lean();

            return res.status(201).json({
                success: true,

                message:
                    "Rating submitted successfully",

                rating:
                    populatedRating
            });
        } catch (error) {
            console.log(
                "Create rating error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to submit rating"
            });
        }
    }
);

// ==================================================
// RATINGS - GET FOR USER
// ==================================================

app.get(
    "/api/ratings/user/:userId",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.userId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid user ID"
                });
            }

            const ratings =
                await Rating
                    .find({
                        toUser:
                            req.params.userId
                    })
                    .populate(
                        "fromUser",
                        "name email"
                    )
                    .populate(
                        "foodId",
                        "foodName"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            const total =
                ratings.length;

            const average =
                total > 0
                    ? Number(
                          (
                              ratings.reduce(
                                  (
                                      sum,
                                      item
                                  ) =>
                                      sum +
                                      Number(
                                          item.rating
                                      ),
                                  0
                              ) /
                              total
                          ).toFixed(2)
                      )
                    : 0;

            return res.json({
                success: true,

                count:
                    total,

                averageRating:
                    average,

                ratings
            });
        } catch (error) {
            console.log(
                "Get user ratings error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch ratings"
            });
        }
    }
);

// ==================================================
// RATINGS - GET FOR FOOD
// ==================================================

app.get(
    "/api/ratings/food/:foodId",
    async (req, res) => {
        try {
            if (
                !isValidObjectId(
                    req.params.foodId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid food ID"
                });
            }

            const ratings =
                await Rating
                    .find({
                        foodId:
                            req.params.foodId
                    })
                    .populate(
                        "fromUser",
                        "name email"
                    )
                    .populate(
                        "toUser",
                        "name email"
                    )
                    .sort({
                        createdAt: -1
                    })
                    .lean();

            const average =
                ratings.length > 0
                    ? Number(
                          (
                              ratings.reduce(
                                  (
                                      sum,
                                      item
                                  ) =>
                                      sum +
                                      Number(
                                          item.rating
                                      ),
                                  0
                              ) /
                              ratings.length
                          ).toFixed(2)
                      )
                    : 0;

            return res.json({
                success: true,

                count:
                    ratings.length,

                averageRating:
                    average,

                ratings
            });
        } catch (error) {
            console.log(
                "Get food ratings error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch food ratings"
            });
        }
    }
);

// ==================================================
// ADMIN - ALL FOOD
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
                        createdAt: -1
                    })
                    .lean();

            return res.json({
                success: true,

                count:
                    foods.length,

                foods:
                    foods.map(
                        (food) =>
                            formatFood(food)
                    )
            });
        } catch (error) {
            console.log(
                "Admin food error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch all food"
            });
        }
    }
);

// ==================================================
// ADMIN STATS
// ==================================================

app.get(
    "/api/admin/stats",
    async (req, res) => {
        try {
            const now =
                new Date();

            await Food.updateMany(
                {
                    status:
                        "available",

                    expiryTime: {
                        $lt:
                            now
                    }
                },
                {
                    $set: {
                        status:
                            "expired"
                    }
                }
            );

            const [
                totalUsers,
                totalDonors,
                totalReceivers,
                totalAdmins,
                totalFood,
                availableFood,
                claimedFood,
                pickedUpFood,
                completedFood,
                cancelledFood,
                expiredFood,
                distributedFood,
                totalNotifications,
                totalRatings
            ] =
                await Promise.all([
                    User.countDocuments(),

                    User.countDocuments({
                        role:
                            "donor"
                    }),

                    User.countDocuments({
                        role:
                            "receiver"
                    }),

                    User.countDocuments({
                        role:
                            "admin"
                    }),

                    Food.countDocuments(),

                    Food.countDocuments({
                        status:
                            "available"
                    }),

                    Food.countDocuments({
                        status:
                            "claimed"
                    }),

                    Food.countDocuments({
                        status:
                            "picked_up"
                    }),

                    Food.countDocuments({
                        status:
                            "completed"
                    }),

                    Food.countDocuments({
                        status:
                            "cancelled"
                    }),

                    Food.countDocuments({
                        status:
                            "expired"
                    }),

                    Food.countDocuments({
                        status:
                            "distributed"
                    }),

                    Notification.countDocuments(),

                    Rating.countDocuments()
                ]);

            return res.json({
                success: true,

                stats: {
                    totalUsers,

                    totalDonors,

                    totalReceivers,

                    totalAdmins,

                    totalFood,

                    availableFood,

                    claimedFood,

                    pickedUpFood,

                    completedFood,

                    cancelledFood,

                    expiredFood,

                    distributedFood,

                    totalNotifications,

                    totalRatings
                }
            });
        } catch (error) {
            console.log(
                "Admin stats error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch admin statistics"
            });
        }
    }
);

// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
    "/api/health",
    (req, res) => {
        res.status(200).json({
            success: true,
            server: "running",
            time:
                new Date().toISOString()
        });
    }
);

// ==================================================
// 404 HANDLER
// ==================================================

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,

            message:
                "API endpoint not found"
        });
    }
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
    (error, req, res, next) => {
        console.log(
            "Unhandled server error:",
            error
        );

        res.status(500).json({
            success: false,

            message:
                "Internal server error"
        });
    }
);

// ==================================================
// START SERVER
// ==================================================

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