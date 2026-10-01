import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import "./App.css";
// ==================================================
// API
// ==================================================

const API =
  "https://foodsurplussystem.onrender.com/api";

// ==================================================
// BACKEND WARM-UP
// ==================================================

function useBackendWarmup() {
  const [backendReady, setBackendReady] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const warmUpBackend = async () => {
      try {
        console.log(
          "Warming up FoodSurplus backend..."
        );

        await axios.get(API, {
          timeout: 15000,
        });

        if (!cancelled) {
          setBackendReady(true);
        }

        console.log(
          "FoodSurplus backend is ready."
        );
      } catch (error) {
        console.log(
          "Backend warm-up:",
          error.message
        );
      }
    };

    warmUpBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  return backendReady;
}

// ==================================================
// DISTANCE + TRAVEL TIME
// CURRENT GPS -> FOOD LOCATION
// BACKEND ROUTE + FALLBACK GEOCODING/OSRM
// ==================================================

// --------------------------------------------------
function useCurrentLocation() {
  const [userCoords, setUserCoords] = useState(null);
  const [locationError, setLocationError] = useState("");

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.log("Current location error:", error.message);
        setLocationError("Unable to get your current location. Please allow location access.");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    userCoords,
    locationError,
    refreshLocation: getCurrentLocation,
  };
}
// LOCATION ALIASES
// --------------------------------------------------

const LOCATION_ALIASES = {
  // Andhra Pradesh
  vizag:
    "Visakhapatnam, Andhra Pradesh, India",

  visakhapatnam:
    "Visakhapatnam, Andhra Pradesh, India",

  tuni:
    "Tuni, Andhra Pradesh, India",

  annavaram:
    "Annavaram, Andhra Pradesh, India",

  tirupati:
    "Tirupati, Andhra Pradesh, India",

  rajahmundry:
    "Rajahmundry, Andhra Pradesh, India",

  kadapa:
    "Kadapa, Andhra Pradesh, India",

  mandapeta:
    "Mandapeta, Andhra Pradesh, India",

  vijayawada:
    "Vijayawada, Andhra Pradesh, India",

  guntur:
    "Guntur, Andhra Pradesh, India",

  kakinada:
    "Kakinada, Andhra Pradesh, India",

  nellore:
    "Nellore, Andhra Pradesh, India",

  anantapur:
    "Anantapur, Andhra Pradesh, India",

  anakapalle:
    "Anakapalle, Andhra Pradesh, India",

  srikakulam:
    "Srikakulam, Andhra Pradesh, India",

  ongole:
    "Ongole, Andhra Pradesh, India",

  eluru:
    "Eluru, Andhra Pradesh, India",

  machilipatnam:
    "Machilipatnam, Andhra Pradesh, India",

  // Telangana
  hyderabad:
    "Hyderabad, Telangana, India",

  // Tamil Nadu
  chennai:
    "Chennai, Tamil Nadu, India",

  // Karnataka
  bangalore:
    "Bengaluru, Karnataka, India",

  bengaluru:
    "Bengaluru, Karnataka, India",

  // Maharashtra
  mumbai:
    "Mumbai, Maharashtra, India",
};

// --------------------------------------------------
// GEOCODING CACHE
// --------------------------------------------------

const foodLocationCache = new Map();

// --------------------------------------------------
// GEOCODE FOOD LOCATION
// SMART MULTI-FALLBACK VERSION
// --------------------------------------------------

const geocodeFoodLocation = async (
  location
) => {
  if (!location || !location.trim()) {
    throw new Error(
      "Food location is not available."
    );
  }

  const originalLocation =
    location.trim();

  const cacheKey =
    originalLocation.toLowerCase();

  // ------------------------------------------------
  // CACHE
  // ------------------------------------------------

  if (
    foodLocationCache.has(cacheKey)
  ) {
    return foodLocationCache.get(
      cacheKey
    );
  }

  // ------------------------------------------------
  // BUILD SEARCH QUERIES
  // ------------------------------------------------

  const searchQueries = [];

  const normalizedLocation =
    cacheKey
      .replace(/\s+/g, " ")
      .trim();

  // 1. Exact alias
  if (
    LOCATION_ALIASES[
      normalizedLocation
    ]
  ) {
    searchQueries.push(
      LOCATION_ALIASES[
        normalizedLocation
      ]
    );
  }

  // 2. Exact user location
  searchQueries.push(
    `${originalLocation}, India`
  );

  // 3. Exact user location without India
  searchQueries.push(
    originalLocation
  );

  // ------------------------------------------------
  // SPECIAL LOCATION FALLBACKS
  // ------------------------------------------------

  if (
    normalizedLocation.includes(
      "annavaram"
    )
  ) {
    searchQueries.push(
      "Annavaram, East Godavari, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Annavaram, Kakinada district, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Annavaram temple, Andhra Pradesh, India"
    );
  }

  if (
    normalizedLocation.includes(
      "mumbai"
    )
  ) {
    searchQueries.push(
      "Mumbai, Maharashtra, India"
    );

    searchQueries.push(
      "Mumbai, India"
    );
  }

  if (
    normalizedLocation.includes(
      "chennai"
    )
  ) {
    searchQueries.push(
      "Chennai, Tamil Nadu, India"
    );

    searchQueries.push(
      "Chennai, India"
    );
  }

  if (
    normalizedLocation.includes(
      "vizag"
    ) ||
    normalizedLocation.includes(
      "visakhapatnam"
    )
  ) {
    searchQueries.push(
      "Visakhapatnam, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Visakhapatnam, India"
    );
  }

  if (
    normalizedLocation.includes(
      "kadapa"
    )
  ) {
    searchQueries.push(
      "Kadapa, Andhra Pradesh, India"
    );

    searchQueries.push(
      "YSR Kadapa district, Andhra Pradesh, India"
    );
  }

  if (
    normalizedLocation.includes(
      "mandapeta"
    )
  ) {
    searchQueries.push(
      "Mandapeta, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Mandapeta, East Godavari, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Mandapeta, India"
    );
  }

  if (
    normalizedLocation.includes(
      "tuni"
    )
  ) {
    searchQueries.push(
      "Tuni, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Tuni, Kakinada district, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Tuni, India"
    );
  }

  if (
    normalizedLocation.includes(
      "tirupati"
    )
  ) {
    searchQueries.push(
      "Tirupati, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Tirupati, India"
    );
  }

  if (
    normalizedLocation.includes(
      "rajahmundry"
    )
  ) {
    searchQueries.push(
      "Rajahmundry, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Rajamahendravaram, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Rajahmundry, India"
    );
  }

  if (
    normalizedLocation.includes(
      "vijayawada"
    )
  ) {
    searchQueries.push(
      "Vijayawada, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Vijayawada, India"
    );
  }

  // ------------------------------------------------
  // MOHAN BABU UNIVERSITY / RANGAMPETA
  // ------------------------------------------------

  if (
    normalizedLocation.includes(
      "mohan babu"
    ) ||
    normalizedLocation.includes(
      "rangampeta"
    ) ||
    normalizedLocation.includes(
      "rangampet"
    )
  ) {
    searchQueries.push(
      "Mohan Babu University, Tirupati, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Sree Sainath Nagar, A Rangampet, Tirupati, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Rangampeta, Tirupati, Andhra Pradesh, India"
    );

    searchQueries.push(
      "Tirupati, Andhra Pradesh, India"
    );
  }

  // ------------------------------------------------
  // REMOVE DUPLICATES
  // ------------------------------------------------

  const uniqueQueries = [
    ...new Set(
      searchQueries.filter(
        Boolean
      )
    ),
  ];

  console.log(
    "Geocoding location:",
    originalLocation
  );

  console.log(
    "Search queries:",
    uniqueQueries
  );

  // ------------------------------------------------
  // TRY EVERY QUERY
  // ------------------------------------------------

  for (
    const query of uniqueQueries
  ) {
    try {
      console.log(
        "Trying:",
        query
      );

      const response =
        await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: query,
              format: "json",
              limit: 3,
              addressdetails: 1,
              countrycodes: "in",
            },

            headers: {
              Accept:
                "application/json",

              "Accept-Language":
                "en-US,en",
            },

            timeout: 15000,
          }
        );

      const results =
        response.data;

      if (
        Array.isArray(results) &&
        results.length > 0
      ) {
        // ------------------------------------------
        // FIND FIRST VALID COORDINATES
        // ------------------------------------------

        for (
          const result of results
        ) {
          const lat =
            Number(result.lat);

          const lon =
            Number(result.lon);

          if (
            Number.isFinite(lat) &&
            Number.isFinite(lon)
          ) {
            const coordinates = {
              lat,
              lon,
            };

            console.log(
              "Location found:",
              query,
              coordinates
            );

            foodLocationCache.set(
              cacheKey,
              coordinates
            );

            return coordinates;
          }
        }
      }

      console.log(
        "No valid result:",
        query
      );
    } catch (error) {
      console.log(
        "Geocoding failed:",
        query,
        error.message
      );
    }
  }

  // ------------------------------------------------
  // NOTHING FOUND
  // ------------------------------------------------

  throw new Error(
    `Could not find location: ${originalLocation}`
  );
};

// --------------------------------------------------
// OSRM ROAD ROUTE FALLBACK
// --------------------------------------------------
const calculateOSRMRoute = async (
  userCoords,
  destinationCoords
) => {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${userCoords.lon},${userCoords.lat};` +
    `${destinationCoords.lon},${destinationCoords.lat}`;

  const response =
    await axios.get(
      url,
      {
        params: {
          overview: "false",
          steps: false,
        },
        timeout: 30000,
      }
    );

  if (
    response.data?.code !==
      "Ok" ||
    !response.data?.routes?.length
  ) {
    throw new Error(
      "Road route could not be calculated."
    );
  }

  const route =
    response.data.routes[0];

  const distanceKm =
    Number(route.distance) /
    1000;

  const totalMinutes =
    Math.round(
      Number(route.duration) /
        60
    );

  let travelTime = "";

  if (totalMinutes < 60) {
    travelTime =
      `${totalMinutes} min`;
  } else {
    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    if (minutes === 0) {
      travelTime =
        `${hours} hr`;
    } else {
      travelTime =
        `${hours} hr ${minutes} min`;
    }
  }

  return {
    distanceKm,
    travelTime,
  };
};

// --------------------------------------------------
// DISTANCE INFO COMPONENT
// --------------------------------------------------

function DistanceInfo({
  foodId,
  location,
  userCoords,
}) {
  const [info, setInfo] = useState(null);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const calculateRoute = async () => {
      if (
        !userCoords ||
        !foodId ||
        !location?.trim()
      ) {
        setInfo(null);
        setErrorMessage("");
        return;
      }

      setLoading(true);
      setInfo(null);
      setErrorMessage("");

      // ==================================================
      // STEP 1 - EXISTING BACKEND ROUTE
      // ==================================================

      try {
        console.log(
          "Trying FoodSurplus backend route:",
          location
        );

        const response = await axios.get(
          `${API}/food/${foodId}/route`,
          {
            params: {
              latitude: userCoords.lat,
              longitude: userCoords.lon,
            },
            timeout: 12000,
          }
        );

        if (
          response.data?.success &&
          response.data?.route
        ) {
          const route = response.data.route;

          if (
            Number.isFinite(
              Number(route.distanceKm)
            )
          ) {
            if (!cancelled) {
              setInfo({
                distance:
                  `${Number(
                    route.distanceKm
                  ).toFixed(2)} km`,

                time:
                  route.travelTime ||
                  "Travel time unavailable",

                destination:
                  response.data.foodLocation ||
                  location,
              });
            }

            return;
          }
        }

        throw new Error(
          response.data?.message ||
            "Backend route unavailable."
        );
      } catch (backendError) {
        console.log(
          "Backend route failed. Using fallback:",
          backendError.message
        );
      }

      // ==================================================
      // STEP 2 - NOMINATIM + OSRM FALLBACK
      // ==================================================

      try {
        console.log(
          "Geocoding food location:",
          location
        );

        const destinationCoords =
          await geocodeFoodLocation(location);

        console.log(
          "Food coordinates:",
          destinationCoords
        );

        const route =
          await calculateOSRMRoute(
            userCoords,
            destinationCoords
          );

        if (!cancelled) {
          setInfo({
            distance:
              `${Number(
                route.distanceKm
              ).toFixed(2)} km`,

            time: route.travelTime,

            destination: location,
          });

          setErrorMessage("");
        }
      } catch (fallbackError) {
        console.log(
          "Fallback route calculation failed:",
          fallbackError
        );

        if (!cancelled) {
          setErrorMessage(
            fallbackError.message ||
              "Failed to calculate food route."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    calculateRoute();

    return () => {
      cancelled = true;
    };
  }, [
    foodId,
    location,
    userCoords?.lat,
    userCoords?.lon,
  ]);

  // ==================================================
  // NO CURRENT LOCATION
  // ==================================================

  if (!userCoords) {
    return (
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "10px",
          background:
            "rgba(255,255,255,0.12)",
        }}
      >
        ?? Getting your current location...
      </div>
    );
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "10px",
          background:
            "rgba(255,255,255,0.12)",
        }}
      >
        ?? Calculating road distance and travel
        time...
      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================

  if (errorMessage) {
    return (
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "10px",
          background:
            "rgba(255,255,255,0.12)",
        }}
      >
        ?? {errorMessage}
      </div>
    );
  }

  // ==================================================
  // NO INFO
  // ==================================================

  if (!info) {
    return null;
  }

  // ==================================================
  // SUCCESS
  // ==================================================

  return (
    <div
      style={{
        marginTop: "10px",
        padding: "12px",
        borderRadius: "10px",
        background:
          "rgba(255,255,255,0.15)",
        lineHeight: "1.8",
      }}
    >
      ??{" "}
      <strong>
        Road Distance:
      </strong>{" "}
      {info.distance}

      <br />

      ??{" "}
      <strong>
        Estimated Travel Time:
      </strong>{" "}
      {info.time}

      <br />

      ??{" "}
      <strong>
        Route Location:
      </strong>{" "}
      {info.destination}
    </div>
  );
}

// ==================================================
// NOTIFICATIONS
// ==================================================

function Notifications({
  userId,
  onClose,
}) {
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadNotifications =
    useCallback(async () => {
      if (!userId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await axios.get(
            `${API}/notifications/${userId}`,
            {
              timeout: 15000,
            }
          );

        const list =
          response.data?.notifications ||
          [];

        setNotifications(list);

        setUnreadCount(
          response.data?.unreadCount ??
            list.filter(
              (item) => !item.read
            ).length
        );
      } catch (error) {
        console.log(
          "Notification load error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Failed to load notifications"
        );
      } finally {
        setLoading(false);
      }
    }, [userId]);

  useEffect(() => {
    loadNotifications();

    // ------------------------------------------
    // AUTO REFRESH EVERY 15 SECONDS
    // ------------------------------------------

    const interval =
      setInterval(
        loadNotifications,
        15000
      );

    return () =>
      clearInterval(interval);
  }, [loadNotifications]);

  const markOneRead = async (
    notificationId
  ) => {
    try {
      await axios.put(
        `${API}/notifications/${notificationId}/read`,
        {},
        {
          timeout: 15000,
        }
      );

      setNotifications(
        (previous) =>
          previous.map((item) =>
            String(item._id) ===
            String(notificationId)
              ? {
                  ...item,
                  read: true,
                }
              : item
          )
      );

      setUnreadCount(
        (previous) =>
          Math.max(0, previous - 1)
      );
    } catch (error) {
      console.log(
        "Mark notification read error:",
        error
      );
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(
        `${API}/notifications/${userId}/read-all`,
        {},
        {
          timeout: 15000,
        }
      );

      setNotifications(
        (previous) =>
          previous.map((item) => ({
            ...item,
            read: true,
          }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.log(
        "Mark all notifications error:",
        error
      );
    }
  };

  const deleteNotification = async (
    notificationId
  ) => {
    try {
      const item =
        notifications.find(
          (notification) =>
            String(notification._id) ===
            String(notificationId)
        );

      await axios.delete(
        `${API}/notifications/${notificationId}`,
        {
          timeout: 15000,
        }
      );

      setNotifications(
        (previous) =>
          previous.filter(
            (notification) =>
              String(notification._id) !==
              String(notificationId)
          )
      );

      if (item && !item.read) {
        setUnreadCount(
          (previous) =>
            Math.max(0, previous - 1)
        );
      }
    } catch (error) {
      console.log(
        "Delete notification error:",
        error
      );
    }
  };

  const getNotificationIcon = (
    type
  ) => {
    switch (type) {
      case "claim":
        return "CLAIM";

      case "pickup":
        return "PICKUP";

      case "cancel":
        return "CANCEL";

      case "distribution":
        return "DISTRIBUTED";

      default:
        return "NOTICE";
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    try {
      return new Date(
        date
      ).toLocaleString();
    } catch {
      return "";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "75px",
        right: "20px",
        width: "min(420px, calc(100vw - 40px))",
        maxHeight: "75vh",
        overflowY: "auto",
        zIndex: 9999,
        padding: "18px",
        borderRadius: "18px",
        background:
          "rgba(20,20,30,0.97)",
        backdropFilter:
          "blur(18px)",
        boxShadow:
          "0 15px 40px rgba(0,0,0,0.35)",
        border:
          "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "15px",
          gap: "10px",
        }}
      >
        <h2
          style={{
            margin: 0,
          }}
        >
          Notifications
        </h2>

        <button
          onClick={onClose}
          style={{
            border: "none",
            background:
              "rgba(255,255,255,0.12)",
            color: "inherit",
            borderRadius: "8px",
            padding: "7px 10px",
            cursor: "pointer",
          }}
        > Close </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "15px",
          gap: "10px",
        }}
      >
        <span>
          {unreadCount > 0
            ? `${unreadCount} unread`
            : "All notifications read"}
        </span>

        {unreadCount > 0 && (
          <button
            className="secondary-btn"
            onClick={markAllRead}
          >
            ? Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="message">
          ?? Loading notifications...
        </div>
      ) : error ? (
        <div className="message">
          ?? {error}
        </div>
      ) : notifications.length ===
        0 ? (
        <div
          style={{
            padding: "25px",
            textAlign: "center",
            opacity: 0.8,
          }}
        >
          <div
            style={{
              fontSize: "40px",
              marginBottom: "10px",
            }}
          >
            ??
          </div>

          <p>
            No notifications yet.
          </p>
        </div>
      ) : (
        notifications.map(
          (notification) => (
            <div
              key={notification._id}
              style={{
                padding: "14px",
                marginBottom: "10px",
                borderRadius: "12px",
                background:
                  notification.read
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(59,130,246,0.20)",
                border:
                  notification.read
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(59,130,246,0.40)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    fontSize: "25px",
                  }}
                >
                  {getNotificationIcon(
                    notification.type
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <strong>
                    {notification.title}
                  </strong>

                  {!notification.read && (
                    <span
                      style={{
                        marginLeft: "8px",
                        fontSize: "11px",
                        padding:
                          "3px 7px",
                        borderRadius:
                          "20px",
                        background:
                          "#3b82f6",
                      }}
                    >
                      NEW
                    </span>
                  )}

                  <p
                    style={{
                      margin:
                        "7px 0",
                    }}
                  >
                    {
                      notification.message
                    }
                  </p>

                  <small
                    style={{
                      opacity: 0.65,
                    }}
                  >
                    {formatDate(
                      notification.createdAt
                    )}
                  </small>

                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      marginTop: "10px",
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {!notification.read && (
                      <button
                        className="secondary-btn"
                        onClick={() =>
                          markOneRead(
                            notification._id
                          )
                        }
                      >
                        ? Read
                      </button>
                    )}

                    <button
                      className="admin-login-btn"
                      onClick={() =>
                        deleteNotification(
                          notification._id
                        )
                      }
                    >
                      ?? Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        )
      )}
    </div>
  );
}

// ==================================================
// LOGIN
// ==================================================

function Login({
  onLogin,
  goRegister,
  goAdminLogin,
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const response =
        await axios.post(
          `${API}/auth/login`,
          {
            email: email.trim(),
            password,
          },
          {
            timeout: 15000,
          }
        );

      if (
        response.data &&
        response.data.user
      ) {
        onLogin(
          response.data.user
        );
      } else {
        setMessage(
          response.data?.message ||
            "Login failed"
        );
      }
    } catch (error) {
      console.log(
        "Login error:",
        error
      );

      setMessage(
        error.response?.data
          ?.message ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <h1>
          Welcome Back
        </h1>

        <p className="subtitle">
          Login to FoodSurplus
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
            disabled={loading}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
            disabled={loading}
            autoComplete="current-password"
          />

          <button
            className="primary-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?

          <button
            className="text-btn"
            onClick={goRegister}
            disabled={loading}
          >
            Register
          </button>
        </p>

        <button
          className="admin-login-btn"
          onClick={goAdminLogin}
          disabled={loading}
        >
          ?? Admin Login
        </button>
      </div>
    </div>
  );
}

// ==================================================
// ADMIN LOGIN
// ==================================================

function AdminLogin({
  onLogin,
  goLogin,
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const response =
        await axios.post(
          `${API}/auth/login`,
          {
            email: email.trim(),
            password,
          },
          {
            timeout: 15000,
          }
        );

      if (
        response.data.user?.role !==
        "admin"
      ) {
        setMessage(
          "Access denied. Admin account required."
        );
        return;
      }

      onLogin(
        response.data.user
      );
    } catch (error) {
      console.log(
        "Admin login error:",
        error
      );

      setMessage(
        error.response?.data
          ?.message ||
          "Admin login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <div className="hero-icon">
          ??
        </div>

        <h1>
          Admin Login
        </h1>

        <p className="subtitle">
          FoodSurplus Administration
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            required
            disabled={loading}
          />

          <button
            className="primary-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Admin Login"}
          </button>
        </form>

        <p className="bottom-text">
          Regular user?

          <button
            className="text-btn"
            onClick={goLogin}
            disabled={loading}
          >
            User Login
          </button>
        </p>
      </div>
    </div>
  );
}

// ==================================================
// REGISTER
// ==================================================

function Register({
  goLogin,
}) {
  const [form, setForm] =
    useState({
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
    });

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const response =
        await axios.post(
          `${API}/auth/register`,
          form,
          {
            timeout: 15000,
          }
        );

      setMessage(
        response.data.message
      );

      setTimeout(() => {
        goLogin();
      }, 1200);
    } catch (error) {
      setMessage(
        error.response?.data
          ?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-background register-bg">
      <div className="glass-card auth-card">
        <h1>
          Create Account
        </h1>

        <p className="subtitle">
          Join FoodSurplus
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <input
            type="text"
            name="address"
            placeholder="Address / Location"
            value={form.address}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <button
            className="primary-btn"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Account"}
          </button>
        </form>

        <p className="bottom-text">
          Already have an account?

          <button
            className="text-btn"
            onClick={goLogin}
            disabled={loading}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

// ==================================================
// HOME
// ==================================================

function Home({
  goLogin,
  goRegister,
  goAdminLogin,
}) {
  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="logo">
          ??? FoodSurplus
        </div>

        <div className="nav-buttons">
          <button
            onClick={goLogin}
          >
            Login
          </button>

          <button
            onClick={goRegister}
          >
            Register
          </button>

          <button
            className="admin-nav-btn"
            onClick={goAdminLogin}
          >
            ?? Admin
          </button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-icon">
            ??
          </div>

          <p className="tagline">
            SMART FOOD REDISTRIBUTION
          </p>

          <h1>
            Food Surplus System
          </h1>

          <p className="hero-description">
            Connecting surplus food with
            people who need it. Together,
            we can reduce food waste and
            help communities.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn large-btn"
              onClick={goRegister}
            >
              Get Started
            </button>

            <button
              className="secondary-btn"
              onClick={goLogin}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// USER DASHBOARD
// ==================================================

function UserDashboard({
  user,
  logout,
}) {
  const [food, setFood] =
    useState({
      foodName: "",
      foodType: "Veg",
      quantity: "",
      unit: "plates",
      description: "",
      location: "",
      expiryTime: "",
    });

  const [foods, setFoods] =
    useState([]);

  const [claimed, setClaimed] =
    useState([]);

  const [myDonations, setMyDonations] =
    useState([]);

  const [tab, setTab] =
    useState("donate");

  const [message, setMessage] =
    useState("");

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [notificationCount, setNotificationCount] =
    useState(0);

  // ==================================================
  // PROFILE STATES
  // ==================================================

  const [showUserMenu, setShowUserMenu] =
    useState(false);

  const [showEditProfile, setShowEditProfile] =
    useState(false);

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [profileUser, setProfileUser] =
    useState(user);

  const [profileForm, setProfileForm] =
    useState({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      address: user.address || "",
    });

  const [passwordForm, setPasswordForm] =
    useState({
      newPassword: "",
      confirmPassword: "",
    });

  const [profileMessage, setProfileMessage] =
    useState("");

  const [profileLoading, setProfileLoading] =
    useState(false);

  // ==================================================
  // CURRENT LOCATION
  // DO NOT CHANGE
  // ==================================================

  const {
    userCoords,
    locationError,
    refreshLocation,
  } = useCurrentLocation();

  const userId =
    user.id || user._id;

  // ==================================================
  // PROFILE INPUT
  // ==================================================

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  // ==================================================
  // UPDATE PROFILE
  // ==================================================

  const updateProfile = async (e) => {
    e.preventDefault();

    if (profileLoading) {
      return;
    }

    setProfileMessage("");
    setProfileLoading(true);

    try {
      const response =
        await axios.put(
          `${API}/users/${userId}`,
          {
            name: profileForm.name.trim(),
            email: profileForm.email.trim(),
            phone: profileForm.phone.trim(),
            address: profileForm.address.trim(),
          },
          {
            timeout: 15000,
          }
        );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to update profile"
        );
      }

      const updatedUser =
        response.data.user;

      setProfileUser(updatedUser);

      setProfileForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
      });

      setProfileMessage(
        "Profile updated successfully!"
      );

      setShowEditProfile(false);
      setShowUserMenu(false);

      setTimeout(() => {
        setProfileMessage("");
      }, 3000);
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // ==================================================
  // CHANGE PASSWORD
  // ==================================================

  const changePassword = async (e) => {
    e.preventDefault();

    if (profileLoading) {
      return;
    }

    if (
      passwordForm.newPassword.length < 6
    ) {
      setProfileMessage(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      setProfileMessage(
        "New password and confirm password do not match."
      );
      return;
    }

    setProfileMessage("");
    setProfileLoading(true);

    try {
      const response =
        await axios.put(
          `${API}/users/${userId}`,
          {
            password:
              passwordForm.newPassword,
          },
          {
            timeout: 15000,
          }
        );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to change password"
        );
      }

      setPasswordForm({
        newPassword: "",
        confirmPassword: "",
      });

      setShowChangePassword(false);
      setShowUserMenu(false);

      setProfileMessage(
        "Password changed successfully!"
      );

      setTimeout(() => {
        setProfileMessage("");
      }, 3000);
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to change password"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // ==================================================
  // LOAD NOTIFICATION COUNT
  // ==================================================

  const loadNotificationCount =
    useCallback(async () => {
      if (!userId) {
        return;
      }

      try {
        const response =
          await axios.get(
            `${API}/notifications/${userId}`,
            {
              timeout: 15000,
            }
          );

        setNotificationCount(
          response.data?.unreadCount || 0
        );
      } catch (error) {
        console.log(
          "Notification count error:",
          error
        );
      }
    }, [userId]);

  // ==================================================
  // LOAD AVAILABLE FOOD
  // ==================================================

  const loadFoods =
    useCallback(async () => {
      try {
        const response =
          await axios.get(
            `${API}/food`,
            {
              timeout: 15000,
            }
          );

        setFoods(
          response.data.foods || []
        );
      } catch (error) {
        console.log(
          "Load food error:",
          error
        );
      }
    }, []);

  // ==================================================
  // LOAD CLAIMED FOOD
  // ==================================================

  const loadClaimed =
    useCallback(async () => {
      try {
        const response =
          await axios.get(
            `${API}/food/receiver/${userId}`,
            {
              timeout: 15000,
            }
          );

        setClaimed(
          response.data.foods || []
        );
      } catch (error) {
        console.log(
          "Load claimed food error:",
          error
        );
      }
    }, [userId]);

  // ==================================================
  // LOAD MY DONATIONS
  // ==================================================

  const loadMyDonations =
    useCallback(async () => {
      try {
        const response =
          await axios.get(
            `${API}/food/donor/${userId}`,
            {
              timeout: 15000,
            }
          );

        setMyDonations(
          response.data.foods || []
        );
      } catch (error) {
        console.log(
          "Load donations error:",
          error
        );
      }
    }, [userId]);

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadFoods();
    loadClaimed();
    loadMyDonations();
    loadNotificationCount();
  }, [
    loadFoods,
    loadClaimed,
    loadMyDonations,
    loadNotificationCount,
  ]);

  // ==================================================
  // AUTO REFRESH
  // ==================================================

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadFoods();
        loadClaimed();
        loadMyDonations();
        loadNotificationCount();
      }, 15000);

    return () =>
      clearInterval(interval);
  }, [
    loadFoods,
    loadClaimed,
    loadMyDonations,
    loadNotificationCount,
  ]);

  // ==================================================
  // INPUT CHANGE
  // ==================================================

  const handleChange = (e) => {
    setFood({
      ...food,
      [e.target.name]:
        e.target.value,
    });
  };

  // ==================================================
  // DONATE FOOD
  // ==================================================

  const addFood = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      await axios.post(
        `${API}/food`,
        {
          donorId: userId,
          foodName: food.foodName,
          foodType: food.foodType,
          quantity: Number(food.quantity),
          unit: food.unit,
          description: food.description,
          location: food.location,
          expiryTime: food.expiryTime,
        },
        {
          timeout: 15000,
        }
      );

      setMessage(
        "Food donated successfully!"
      );

      setFood({
        foodName: "",
        foodType: "Veg",
        quantity: "",
        unit: "plates",
        description: "",
        location: "",
        expiryTime: "",
      });

      await loadFoods();
      await loadMyDonations();
      await loadNotificationCount();

      setTab("donations");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to donate food"
      );
    }
  };

  // ==================================================
  // CLAIM FOOD
  // ==================================================

  const claimFood = async (foodId) => {
    try {
      setMessage(
        "Claiming food..."
      );

      await axios.put(
        `${API}/food/${foodId}/claim`,
        {
          receiverId: userId,
        },
        {
          timeout: 15000,
        }
      );

      setMessage(
        "Food claimed successfully! Notification created."
      );

      await loadFoods();
      await loadClaimed();
      await loadMyDonations();
      await loadNotificationCount();

      setTab("claimed");

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to claim food"
      );
    }
  };

  // ==================================================
  // CANCEL FOOD
  // ==================================================

  const cancelFood = async (foodId) => {
    const confirmCancel =
      window.confirm(
        "Are you sure you want to cancel this food?"
      );

    if (!confirmCancel) {
      return;
    }

    try {
      await axios.put(
        `${API}/food/${foodId}/cancel`,
        {
          userId,
        },
        {
          timeout: 15000,
        }
      );

      setMessage(
        "Food cancelled successfully!"
      );

      await loadFoods();
      await loadMyDonations();
      await loadNotificationCount();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to cancel food"
      );
    }
  };

  // ==================================================
  // DISTRIBUTE FOOD
  // ==================================================

  const distributeFood =
    async (foodId) => {
      try {
        await axios.put(
          `${API}/food/${foodId}/distribute`,
          {
            userId,
          },
          {
            timeout: 15000,
          }
        );

        setMessage(
          "Food marked as distributed!"
        );

        await loadMyDonations();
        await loadClaimed();
        await loadNotificationCount();
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
            "Failed to distribute food"
        );
      }
    };

  return (
    <div className="dashboard-page donor-bg">

      {/* ==================================================
          NAVBAR
      ================================================== */}

      <nav className="dashboard-nav">

        <div className="logo">
          ??? FoodSurplus
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >

          <span className="role-badge">
            USER
          </span>

          {/* NOTIFICATIONS */}

          <button
            onClick={() =>
              setShowNotifications(
                (previous) =>
                  !previous
              )
            }
            style={{
              position: "relative",
              cursor: "pointer",
            }}
          >
            Notifications

            {notificationCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-8px",
                  minWidth: "21px",
                  height: "21px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "white",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {notificationCount > 99
                  ? "99+"
                  : notificationCount}
              </span>
            )}
          </button>

          {/* ==================================================
              USER PROFILE BUTTON
          ================================================== */}

          <div
            style={{
              position: "relative",
            }}
          >

            <button
              type="button"
              onClick={() =>
                setShowUserMenu(
                  (previous) =>
                    !previous
                )
              }
              style={{
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ??{" "}
              {profileUser.name ||
                "USER"}{" "}
              ?
            </button>

            {/* PROFILE DROPDOWN */}

            {showUserMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "210px",
                  padding: "10px",
                  borderRadius: "14px",
                  background:
                    "rgba(20,20,30,0.98)",
                  backdropFilter:
                    "blur(15px)",
                  boxShadow:
                    "0 15px 35px rgba(0,0,0,0.35)",
                  border:
                    "1px solid rgba(255,255,255,0.15)",
                  zIndex: 10000,
                }}
              >

                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfile(true);
                    setShowUserMenu(false);
                    setProfileMessage("");
                  }}
                  style={{
                    width: "100%",
                    marginBottom: "8px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  ?? Edit Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowUserMenu(false);
                    setProfileMessage("");
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  ?? Change Password
                </button>

              </div>
            )}

          </div>

          {/* LOGOUT */}

          <button
            onClick={logout}
          >
            Logout
          </button>

        </div>
      </nav>

      {/* ==================================================
          NOTIFICATION PANEL
      ================================================== */}

      {showNotifications && (
        <Notifications
          userId={userId}
          onClose={() =>
            setShowNotifications(false)
          }
        />
      )}

      {/* ==================================================
          PROFILE MESSAGE
      ================================================== */}

      {profileMessage && (
        <div
          className="message"
          style={{
            position: "fixed",
            top: "85px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10001,
            minWidth: "280px",
            textAlign: "center",
          }}
        >
          {profileMessage}
        </div>
      )}

      {/* ==================================================
          EDIT PROFILE MODAL
      ================================================== */}

      {showEditProfile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "min(500px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >

            <h2>
              ?? Edit Profile
            </h2>

            <form
              onSubmit={updateProfile}
            >

              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={profileForm.name}
                onChange={
                  handleProfileChange
                }
                required
                disabled={profileLoading}
              />

              <input
                type="email"
                name="email"
                placeholder="Email"
                value={profileForm.email}
                onChange={
                  handleProfileChange
                }
                required
                disabled={profileLoading}
              />

              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                value={profileForm.phone}
                onChange={
                  handleProfileChange
                }
                required
                disabled={profileLoading}
              />

              <input
                type="text"
                name="address"
                placeholder="Address / Location"
                value={profileForm.address}
                onChange={
                  handleProfileChange
                }
                required
                disabled={profileLoading}
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "10px",
                  flexWrap: "wrap",
                }}
              >

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    flex: 1,
                  }}
                >
                  {profileLoading
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() =>
                    setShowEditProfile(false)
                  }
                  disabled={profileLoading}
                  style={{
                    flex: 1,
                  }}
                >
                  Cancel
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          CHANGE PASSWORD MODAL
      ================================================== */}

      {showChangePassword && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "min(500px, 100%)",
            }}
          >

            <h2>
              ?? Change Password
            </h2>

            <form
              onSubmit={changePassword}
            >

              <input
                type="password"
                placeholder="New Password"
                value={
                  passwordForm.newPassword
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword:
                      e.target.value,
                  })
                }
                required
                disabled={profileLoading}
                autoComplete="new-password"
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                value={
                  passwordForm.confirmPassword
                }
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword:
                      e.target.value,
                  })
                }
                required
                disabled={profileLoading}
                autoComplete="new-password"
              />

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "10px",
                  flexWrap: "wrap",
                }}
              >

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    flex: 1,
                  }}
                >
                  {profileLoading
                    ? "Changing..."
                    : "Change Password"}
                </button>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  disabled={profileLoading}
                  style={{
                    flex: 1,
                  }}
                >
                  Cancel
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          DASHBOARD CONTENT
      ================================================== */}

      <div className="dashboard-content">

        <h1>
          FoodSurplus Dashboard
        </h1>

        <p className="welcome">
          Welcome,{" "}
          <strong>
            {profileUser.name}
          </strong>
        </p>

        <p>
          ?? {profileUser.phone}
        </p>

        {/* LOCATION STATUS */}

        {locationError && (
          <div className="message">
            ?? {locationError}

            <br />

            <button
              className="secondary-btn"
              onClick={
                refreshLocation
              }
              style={{
                marginTop: "8px",
              }}
            >
              ?? Retry Location
            </button>
          </div>
        )}

        {userCoords && (
          <div
            style={{
              marginBottom: "15px",
              padding: "12px",
              borderRadius: "10px",
              background:
                "rgba(255,255,255,0.12)",
            }}
          >
            ??{" "}
            <strong>
              Your current location
              is enabled.
            </strong>

            <br />

            ?? Every food card calculates
            road distance and estimated
            travel time from your current
            location.
          </div>
        )}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* ==================================================
            TABS
        ================================================== */}

        <div className="tabs">

          <button
            className={
              tab === "donate"
                ? "active-tab"
                : ""
            }
            onClick={() =>
              setTab("donate")
            }
          >
            ?? Donate Food
          </button>

          <button
            className={
              tab === "available"
                ? "active-tab"
                : ""
            }
            onClick={() =>
              setTab("available")
            }
          >
            ??? Available Food
          </button>

          <button
            className={
              tab === "claimed"
                ? "active-tab"
                : ""
            }
            onClick={() =>
              setTab("claimed")
            }
          >
            ?? My Claimed Food
          </button>

          <button
            className={
              tab === "donations"
                ? "active-tab"
                : ""
            }
            onClick={() =>
              setTab("donations")
            }
          >
            ?? My Donations
          </button>

        </div>

        {/* ==================================================
            DONATE FOOD
        ================================================== */}

        {tab === "donate" && (
          <div className="glass-card dashboard-card">

            <h2>
              ?? Donate Surplus Food
            </h2>

            <form
              onSubmit={addFood}
            >

              <input
                name="foodName"
                placeholder="Food Name"
                value={
                  food.foodName
                }
                onChange={
                  handleChange
                }
                required
              />

              <select
                name="foodType"
                value={
                  food.foodType
                }
                onChange={
                  handleChange
                }
              >
                <option value="Veg">
                  Veg
                </option>

                <option value="Non-Veg">
                  Non-Veg
                </option>
              </select>

              <div className="two-column">

                <input
                  type="number"
                  name="quantity"
                  placeholder="Quantity"
                  min="1"
                  value={
                    food.quantity
                  }
                  onChange={
                    handleChange
                  }
                  required
                />

                <select
                  name="unit"
                  value={
                    food.unit
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="plates">
                    Plates
                  </option>

                  <option value="kg">
                    Kg
                  </option>

                  <option value="litres">
                    Litres
                  </option>

                  <option value="packets">
                    Packets
                  </option>
                </select>

              </div>

              <input
                name="location"
                placeholder="Food Location"
                value={
                  food.location
                }
                onChange={
                  handleChange
                }
                required
              />

              <input
                type="datetime-local"
                name="expiryTime"
                value={
                  food.expiryTime
                }
                onChange={
                  handleChange
                }
                required
              />

              <textarea
                name="description"
                placeholder="Description"
                value={
                  food.description
                }
                onChange={
                  handleChange
                }
              />

              <button
                className="primary-btn"
                type="submit"
              >
                Donate Food
              </button>

            </form>
          </div>
        )}

        {/* ==================================================
            AVAILABLE FOOD
        ================================================== */}

        {tab === "available" && (
          <div className="food-grid">

            {foods.length === 0 ? (
              <div className="glass-card empty-card">
                <h2>No food available</h2>

                <p>
                  No food currently
                  available.
                </p>
              </div>
            ) : (
              foods.map((item) => (
                <div
                  className="glass-card food-card"
                  key={item._id}
                >

                  <div className="food-icon">
                    ??
                  </div>

                  <h2>
                    {item.foodName}
                  </h2>

                  <p>
                    <strong>
                      Type:
                    </strong>{" "}
                    {item.foodType}
                  </p>

                  <p>
                    <strong>
                      Quantity:
                    </strong>{" "}
                    {item.quantity}{" "}
                    {item.unit}
                  </p>

                  <p>
                    <strong>
                      Location:
                    </strong>{" "}
                    {item.location}
                  </p>

                  <p>
                    <strong>
                      Donor:
                    </strong>{" "}
                    {item.donorName ||
                      item.donorId?.name ||
                      "-"}
                  </p>

                  <p>
                    ??{" "}
                    <strong>
                      Donor Phone:
                    </strong>{" "}
                    {item.donorPhone ||
                      item.donorId?.phone ||
                      "-"}
                  </p>

                  {item.description && (
                    <p>
                      {item.description}
                    </p>
                  )}

                  {/* LOCATION - PRESERVED */}

                  <ViewLocation
                    location={
                      item.location
                    }
                    userCoords={
                      userCoords
                    }
                  />

                  {/* DISTANCE - PRESERVED */}

                  <DistanceInfo
                    foodId={item._id}
                    location={
                      item.location
                    }
                    userCoords={
                      userCoords
                    }
                  />

                  {String(
                    item.donorId?._id ||
                      item.donorId
                  ) !==
                    String(userId) && (
                    <button
                      className="primary-btn"
                      onClick={() =>
                        claimFood(
                          item._id
                        )
                      }
                      style={{
                        marginTop:
                          "10px",
                        width: "100%",
                      }}
                    >
                      ?? Claim Food
                    </button>
                  )}

                </div>
              ))
            )}

          </div>
        )}

        {/* ==================================================
            CLAIMED FOOD
        ================================================== */}

        {tab === "claimed" && (
          <div className="food-grid">

            {claimed.length === 0 ? (
              <div className="glass-card empty-card">

                <h2>
                  ??
                </h2>

                <p>
                  No claimed food
                  yet.
                </p>

              </div>
            ) : (
              claimed.map((item) => (
                <div
                  className="glass-card food-card"
                  key={item._id}
                >

                  <div className="food-icon">
                    ?
                  </div>

                  <h2>
                    {item.foodName}
                  </h2>

                  <p>
                    <strong>
                      Quantity:
                    </strong>{" "}
                    {item.quantity}{" "}
                    {item.unit}
                  </p>

                  <p>
                    <strong>
                      Location:
                    </strong>{" "}
                    {item.location}
                  </p>

                  <p>
                    ??{" "}
                    <strong>
                      Donor:
                    </strong>{" "}
                    {item.donorId?.name ||
                      item.donorName ||
                      "-"}
                  </p>

                  <p>
                    ??{" "}
                    <strong>
                      Donor Phone:
                    </strong>{" "}
                    {item.donorId?.phone ||
                      item.donorPhone ||
                      "-"}
                  </p>

                  {/* LOCATION - PRESERVED */}

                  <ViewLocation
                    location={
                      item.location
                    }
                    userCoords={
                      userCoords
                    }
                  />

                  {/* DISTANCE - PRESERVED */}

                  <DistanceInfo
                    foodId={item._id}
                    location={
                      item.location
                    }
                    userCoords={
                      userCoords
                    }
                  />

                  <p className="claimed-text">
                    ? Successfully
                    Claimed
                  </p>

                </div>
              ))
            )}

          </div>
        )}

        {/* ==================================================
            MY DONATIONS
        ================================================== */}

        {tab === "donations" && (
          <div className="food-grid">

            {myDonations.length === 0 ? (
              <div className="glass-card empty-card">

                <h2>
                  ??
                </h2>

                <p>
                  You have not donated
                  any food yet.
                </p>

              </div>
            ) : (
              myDonations.map(
                (item) => (
                  <div
                    className="glass-card food-card"
                    key={item._id}
                  >

                    <div className="food-icon">
                      ??
                    </div>

                    <h2>
                      {item.foodName}
                    </h2>

                    <p>
                      <strong>
                        Quantity:
                      </strong>{" "}
                      {item.quantity}{" "}
                      {item.unit}
                    </p>

                    <p>
                      <strong>
                        Location:
                      </strong>{" "}
                      {item.location}
                    </p>

                    {/* DISTANCE - PRESERVED */}

                    <DistanceInfo
                      foodId={item._id}
                      location={
                        item.location
                      }
                      userCoords={
                        userCoords
                      }
                    />

                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {item.status}
                    </p>

                    {item.status ===
                      "claimed" && (
                      <>

                        <p>
                          ??{" "}
                          <strong>
                            Receiver:
                          </strong>{" "}
                          {item.claimedBy?.name ||
                            "-"}
                        </p>

                        <p>
                          ??{" "}
                          <strong>
                            Receiver Phone:
                          </strong>{" "}
                          {item.claimedBy?.phone ||
                            "-"}
                        </p>

                        <button
                          className="primary-btn"
                          onClick={() =>
                            distributeFood(
                              item._id
                            )
                          }
                        >
                          ? Mark Distributed
                        </button>

                      </>
                    )}

                    {item.status ===
                      "available" && (
                      <button
                        className="admin-login-btn"
                        onClick={() =>
                          cancelFood(
                            item._id
                          )
                        }
                      >
                        ? Cancel Food
                      </button>
                    )}

                    {item.status ===
                      "cancelled" && (
                      <p>
                        ? Food
                        Cancelled
                      </p>
                    )}

                    {item.status ===
                      "distributed" && (
                      <p className="claimed-text">
                        ? Food Distributed
                        Successfully
                      </p>
                    )}

                  </div>
                )
              )
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// ==================================================
// ADMIN DASHBOARD
// ==================================================

function AdminDashboard({
  user,
  logout,
}) {
  const [users, setUsers] =
    useState([]);

  const [foods, setFoods] =
    useState([]);

  const loadData = async () => {
    try {
      const userResponse =
        await axios.get(
          `${API}/users`,
          {
            timeout: 15000,
          }
        );

      setUsers(
        userResponse.data.users ||
          []
      );

      const foodResponse =
        await axios.get(
          `${API}/admin/food`,
          {
            timeout: 15000,
          }
        );

      setFoods(
        foodResponse.data.foods ||
          []
      );
    } catch (error) {
      console.log(
        "Admin load error:",
        error
      );
    }
  };

  useEffect(() => {
    loadData();

    const interval =
      setInterval(
        loadData,
        15000
      );

    return () =>
      clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-page admin-bg">
      <nav className="dashboard-nav">
        <div className="logo">
          ??? FoodSurplus
        </div>

        <div>
          <span className="role-badge">
            ADMIN
          </span>

          <button
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>
          Admin Dashboard
        </h1>

        <p className="welcome">
          Welcome,{" "}
          <strong>
            {user.name}
          </strong>
        </p>

        {/* STATISTICS */}

        <div className="stats-grid">
          <div className="glass-card stat-card">
            <span>
              ??
            </span>

            <h2>
              {users.length}
            </h2>

            <p>
              Total Users
            </p>
          </div>

          <div className="glass-card stat-card">
            <span>
              ??
            </span>

            <h2>
              {foods.length}
            </h2>

            <p>
              Total Food
            </p>
          </div>

          <div className="glass-card stat-card">
            <span>
              ??
            </span>

            <h2>
              {
                users.filter(
                  (u) =>
                    u.role ===
                    "donor"
                ).length
              }
            </h2>

            <p>
              Donors
            </p>
          </div>

          <div className="glass-card stat-card">
            <span>
              ??
            </span>

            <h2>
              {
                users.filter(
                  (u) =>
                    u.role ===
                    "receiver"
                ).length
              }
            </h2>

            <p>
              Receivers
            </p>
          </div>
        </div>

        {/* REGISTERED USERS */}

        <div className="glass-card table-card">
          <h2>
            Registered Users
          </h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    Name
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Phone
                  </th>

                  <th>
                    Address
                  </th>

                  <th>
                    Role
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map(
                  (u) => (
                    <tr
                      key={
                        u._id
                      }
                    >
                      <td>
                        {u.name}
                      </td>

                      <td>
                        {u.email}
                      </td>

                      <td>
                        {u.phone ||
                          "-"}
                      </td>

                      <td>
                        {u.address ||
                          "-"}
                      </td>

                      <td>
                        {u.role}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOD RECORDS */}

        <div className="glass-card table-card">
          <h2>
            Food Records
          </h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>
                    Food
                  </th>

                  <th>
                    Quantity
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Donor
                  </th>

                  <th>
                    Receiver
                  </th>

                  <th>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {foods.map(
                  (food) => (
                    <tr
                      key={
                        food._id
                      }
                    >
                      <td>
                        {
                          food.foodName
                        }
                      </td>

                      <td>
                        {
                          food.quantity
                        }{" "}
                        {
                          food.unit
                        }
                      </td>

                      <td>
                        {
                          food.location
                        }
                      </td>

                      <td>
                        {
                          food.donorId
                            ?.name ||
                          "-"
                        }

                        <br />

                        ??{" "}
                        {
                          food.donorId
                            ?.phone ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          food
                            .claimedBy
                            ?.name ||
                          "-"
                        }

                        <br />

                        ??{" "}
                        {
                          food
                            .claimedBy
                            ?.phone ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          food.status
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// MAIN APP
// ==================================================

function App() {
  const [page, setPage] =
    useState("home");

  const [user, setUser] =
    useState(null);

  // Backend warm-up
  useBackendWarmup();

  // ==================================================
  // USER LOGIN
  // ==================================================

  const handleLogin = (
    loggedUser
  ) => {
    setUser(loggedUser);

    if (
      loggedUser.role ===
      "admin"
    ) {
      setPage("admin");
    } else {
      setPage("user");
    }
  };

  // ==================================================
  // ADMIN LOGIN
  // ==================================================

  const handleAdminLogin =
    (loggedUser) => {
      if (
        loggedUser.role !==
        "admin"
      ) {
        return;
      }

      setUser(loggedUser);
      setPage("admin");
    };

  // ==================================================
  // LOGOUT
  // ==================================================

  const logout = () => {
    setUser(null);
    setPage("home");
  };

  // ==================================================
  // LOGIN
  // ==================================================

  if (page === "login") {
    return (
      <Login
        onLogin={
          handleLogin
        }
        goRegister={() =>
          setPage(
            "register"
          )
        }
        goAdminLogin={() =>
          setPage(
            "admin-login"
          )
        }
      />
    );
  }

  // ==================================================
  // ADMIN LOGIN
  // ==================================================

  if (
    page ===
    "admin-login"
  ) {
    return (
      <AdminLogin
        onLogin={
          handleAdminLogin
        }
        goLogin={() =>
          setPage("login")
        }
      />
    );
  }

  // ==================================================
  // REGISTER
  // ==================================================

  if (
    page === "register"
  ) {
    return (
      <Register
        goLogin={() =>
          setPage("login")
        }
      />
    );
  }

  // ==================================================
  // USER
  // ==================================================

  if (
    page === "user" &&
    user
  ) {
    return (
      <UserDashboard
        user={user}
        logout={logout}
      />
    );
  }

  // ==================================================
  // ADMIN
  // ==================================================

  if (
    page === "admin" &&
    user
  ) {
    return (
      <AdminDashboard
        user={user}
        logout={logout}
      />
    );
  }

  // ==================================================
  // HOME
  // ==================================================

  return (
    <Home
      goLogin={() =>
        setPage("login")
      }
      goRegister={() =>
        setPage(
          "register"
        )
      }
      goAdminLogin={() =>
        setPage(
          "admin-login"
        )
      }
    />
  );
}

export default App;
