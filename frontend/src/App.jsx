import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://localhost:5000/api";

// ==================================================
// MAP LOCATION BUTTONS
// ==================================================

function ViewLocation({ location }) {
  if (!location) {
    return null;
  }

  const openGoogleMaps = () => {
    const url =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(location);

    window.open(url, "_blank");
  };

  const openAppleMaps = () => {
    const url =
      "https://maps.apple.com/?address=" +
      encodeURIComponent(location);

    window.open(url, "_blank");
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <button
        type="button"
        className="primary-btn"
        onClick={openGoogleMaps}
        style={{
          width: "100%",
          marginBottom: "8px",
        }}
      >
        📍 Open in Google Maps
      </button>

      <button
        type="button"
        className="secondary-btn"
        onClick={openAppleMaps}
        style={{
          width: "100%",
        }}
      >
        🍎 Open in Apple Maps
      </button>
    </div>
  );
}

// ==================================================
// CURRENT USER LOCATION
// ==================================================

function useCurrentLocation() {
  const [userCoords, setUserCoords] = useState(null);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setLocationError("");
      },
      (error) => {
        console.log("Location permission error:", error);

        let message =
          "Please allow location access to calculate distance and travel time.";

        if (error.code === 1) {
          message =
            "Location permission denied. Please allow location access.";
        }

        if (error.code === 2) {
          message =
            "Your current location could not be detected. Please check your browser location settings.";
        }

        if (error.code === 3) {
          message =
            "Location request timed out. Please try again.";
        }

        setLocationError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60000,
      }
    );
  }, []);

  return {
    userCoords,
    locationError,
  };
}

// ==================================================
// FREE ROAD DISTANCE + TRAVEL TIME
// ==================================================
// NO GOOGLE API KEY
// NO GOOGLE CLOUD BILLING
//
// Food location is only TEXT.
// Example:
// "Rajahmundry"
// "Tirupati"
// "Hyderabad Tank Bund Telangana"
//
// Process:
//
// User GPS coordinates
//       ↓
// Free Geocoding
//       ↓
// Typed food location coordinates
//       ↓
// Free road routing
//       ↓
// Distance + Travel Time
// ==================================================

function DistanceInfo({ location, userCoords }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const calculateRoute = async () => {
      if (!userCoords) {
        return;
      }

      if (!location || !location.trim()) {
        return;
      }

      setLoading(true);
      setInfo(null);
      setErrorMessage("");

      try {
        // ==================================================
        // STEP 1
        // CONVERT TYPED LOCATION INTO COORDINATES
        // ==================================================

        const geocodeResponse = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              q: location.trim(),
              format: "json",
              limit: 1,
              addressdetails: 1,
            },
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (
          !geocodeResponse.data ||
          geocodeResponse.data.length === 0
        ) {
          throw new Error(
            `Location "${location}" could not be found. Please enter a more complete location.`
          );
        }

        const destination = geocodeResponse.data[0];

        const destinationLat = Number(destination.lat);
        const destinationLon = Number(destination.lon);

        if (
          Number.isNaN(destinationLat) ||
          Number.isNaN(destinationLon)
        ) {
          throw new Error(
            "Invalid destination coordinates."
          );
        }

        // ==================================================
        // STEP 2
        // FREE ROAD ROUTING
        // ==================================================

        const routeResponse = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${userCoords.lon},${userCoords.lat};${destinationLon},${destinationLat}`,
          {
            params: {
              overview: "false",
              steps: false,
            },
          }
        );

        if (
          !routeResponse.data ||
          routeResponse.data.code !== "Ok" ||
          !routeResponse.data.routes ||
          routeResponse.data.routes.length === 0
        ) {
          throw new Error(
            "Road route could not be calculated for this location."
          );
        }

        const route = routeResponse.data.routes[0];

        // ==================================================
        // DISTANCE
        // ==================================================

        const distanceKm = route.distance / 1000;

        // ==================================================
        // TRAVEL TIME
        // ==================================================

        const totalMinutes = Math.round(
          route.duration / 60
        );

        let travelTime = "";

        if (totalMinutes < 60) {
          travelTime = `${totalMinutes} mins`;
        } else {
          const hours = Math.floor(
            totalMinutes / 60
          );

          const minutes = totalMinutes % 60;

          if (minutes === 0) {
            travelTime = `${hours} hr`;
          } else {
            travelTime = `${hours} hr ${minutes} mins`;
          }
        }

        // ==================================================
        // FOUND DESTINATION
        // ==================================================

        const destinationName =
          destination.display_name || location;

        if (!cancelled) {
          setInfo({
            distance: `${distanceKm.toFixed(2)} km`,
            time: travelTime,
            destination: destinationName,
          });

          setErrorMessage("");
        }
      } catch (error) {
        console.log(
          "Free distance calculation error:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            error.message ||
              "Unable to calculate road distance."
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
    location,
    userCoords?.lat,
    userCoords?.lon,
  ]);

  // ==================================================
  // CURRENT LOCATION WAITING
  // ==================================================

  if (!userCoords) {
    return (
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.12)",
        }}
      >
        📍 Getting your current location...
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
          background: "rgba(255,255,255,0.12)",
        }}
      >
        🔄 Finding location and calculating road
        distance...
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
          background: "rgba(255,255,255,0.12)",
        }}
      >
        ⚠️ {errorMessage}
      </div>
    );
  }

  // ==================================================
  // NO RESULT
  // ==================================================

  if (!info) {
    return null;
  }

  // ==================================================
  // RESULT
  // ==================================================

  return (
    <div
      style={{
        marginTop: "10px",
        padding: "12px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.15)",
        lineHeight: "1.8",
      }}
    >
      📏{" "}
      <strong>
        Road Distance:
      </strong>{" "}
      {info.distance}

      <br />

      🚗{" "}
      <strong>
        Estimated Travel Time:
      </strong>{" "}
      {info.time}

      <br />

      📍{" "}
      <strong>
        Found Location:
      </strong>{" "}
      {info.destination}
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/auth/login`,
        {
          email,
          password,
        }
      );

      onLogin(response.data.user);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Login failed"
      );
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <h1>Welcome Back</h1>

        <p className="subtitle">
          Login to FoodSurplus
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            className="primary-btn"
            type="submit"
          >
            Login
          </button>
        </form>

        <p className="bottom-text">
          Don't have an account?

          <button
            className="text-btn"
            onClick={goRegister}
          >
            Register
          </button>
        </p>

        <button
          className="admin-login-btn"
          onClick={goAdminLogin}
        >
          🔐 Admin Login
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
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/auth/login`,
        {
          email,
          password,
        }
      );

      if (
        response.data.user?.role !== "admin"
      ) {
        setMessage(
          "Access denied. Admin account required."
        );

        return;
      }

      onLogin(response.data.user);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Admin login failed"
      );
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <div className="hero-icon">
          🔐
        </div>

        <h1>Admin Login</h1>

        <p className="subtitle">
          FoodSurplus Administration
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            className="primary-btn"
            type="submit"
          >
            Admin Login
          </button>
        </form>

        <p className="bottom-text">
          Regular user?

          <button
            className="text-btn"
            onClick={goLogin}
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

function Register({ goLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    role: "donor",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(
        `${API}/auth/register`,
        form
      );

      setMessage(response.data.message);

      setTimeout(() => {
        goLogin();
      }, 1200);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Registration failed"
      );
    }
  };

  return (
    <div className="page-background register-bg">
      <div className="glass-card auth-card">
        <h1>Create Account</h1>

        <p className="subtitle">
          Join FoodSurplus
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="tel"
            name="phone"
            placeholder="Phone Number"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="address"
            placeholder="Address / Location"
            value={form.address}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="donor">
              Food Donor
            </option>

            <option value="receiver">
              Food Receiver
            </option>
          </select>

          <button
            className="primary-btn"
            type="submit"
          >
            Create Account
          </button>
        </form>

        <p className="bottom-text">
          Already have an account?

          <button
            className="text-btn"
            onClick={goLogin}
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
          🍽️ FoodSurplus
        </div>

        <div className="nav-buttons">
          <button onClick={goLogin}>
            Login
          </button>

          <button onClick={goRegister}>
            Register
          </button>

          <button
            className="admin-nav-btn"
            onClick={goAdminLogin}
          >
            🔐 Admin
          </button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-icon">
            🍲
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
  const [food, setFood] = useState({
    foodName: "",
    foodType: "Veg",
    quantity: "",
    unit: "plates",
    description: "",
    location: "",
    expiryTime: "",
  });

  const [foods, setFoods] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [myDonations, setMyDonations] =
    useState([]);

  const [tab, setTab] =
    useState("donate");

  const [message, setMessage] =
    useState("");

  // ==================================================
  // CURRENT LOCATION
  // ==================================================

  const {
    userCoords,
    locationError,
  } = useCurrentLocation();

  const userId =
    user.id || user._id;

  // ==================================================
  // LOAD AVAILABLE FOOD
  // ==================================================

  const loadFoods = async () => {
    try {
      const response = await axios.get(
        `${API}/food`
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
  };

  // ==================================================
  // LOAD CLAIMED FOOD
  // ==================================================

  const loadClaimed = async () => {
    try {
      const response = await axios.get(
        `${API}/food/receiver/${userId}`
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
  };

  // ==================================================
  // LOAD MY DONATIONS
  // ==================================================

  const loadMyDonations = async () => {
    try {
      const response = await axios.get(
        `${API}/food/donor/${userId}`
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
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    loadFoods();
    loadClaimed();
    loadMyDonations();
  }, []);

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

          foodName:
            food.foodName,

          foodType:
            food.foodType,

          quantity:
            Number(food.quantity),

          unit:
            food.unit,

          description:
            food.description,

          // ONLY TEXT LOCATION
          // NO LATITUDE
          // NO LONGITUDE
          location:
            food.location,

          expiryTime:
            food.expiryTime,
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
      await axios.put(
        `${API}/food/${foodId}/claim`,
        {
          receiverId: userId,
        }
      );

      setMessage(
        "Food claimed successfully!"
      );

      await loadFoods();
      await loadClaimed();
      await loadMyDonations();
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
        }
      );

      setMessage(
        "Food cancelled successfully!"
      );

      await loadFoods();
      await loadMyDonations();
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
          }
        );

        setMessage(
          "Food marked as distributed!"
        );

        await loadMyDonations();
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
            "Failed to distribute food"
        );
      }
    };

  return (
    <div className="dashboard-page donor-bg">
      <nav className="dashboard-nav">
        <div className="logo">
          🍽️ FoodSurplus
        </div>

        <div>
          <span className="role-badge">
            USER
          </span>

          <button onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>
          FoodSurplus Dashboard
        </h1>

        <p className="welcome">
          Welcome,{" "}
          <strong>
            {user.name}
          </strong>
        </p>

        <p>
          📞 {user.phone}
        </p>

        {/* ==================================================
            LOCATION STATUS
        ================================================== */}

        {locationError && (
          <div className="message">
            📍 {locationError}
          </div>
        )}

        {userCoords && (
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              borderRadius: "10px",
              background:
                "rgba(255,255,255,0.12)",
            }}
          >
            📍 Your current location
            is enabled.
            <br />
            Free road routing calculates
            distance and estimated travel
            time separately for every food
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
            🍱 Donate Food
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
            🍽️ Available Food
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
            📦 My Claimed Food
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
            📋 My Donations
          </button>
        </div>

        {/* ==================================================
            DONATE FOOD
        ================================================== */}

        {tab === "donate" && (
          <div className="glass-card dashboard-card">
            <h2>
              🍱 Donate Surplus Food
            </h2>

            <form onSubmit={addFood}>
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
                <h2>🍽️</h2>

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
                    🍱
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
                    📞{" "}
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

                  <ViewLocation
                    location={
                      item.location
                    }
                  />

                  <DistanceInfo
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
                      }}
                    >
                      🤝 Claim Food
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
                <h2>📦</h2>

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
                    ✅
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
                    👤{" "}
                    <strong>
                      Donor:
                    </strong>{" "}
                    {item.donorId?.name ||
                      item.donorName ||
                      "-"}
                  </p>

                  <p>
                    📞{" "}
                    <strong>
                      Donor Phone:
                    </strong>{" "}
                    {item.donorId?.phone ||
                      item.donorPhone ||
                      "-"}
                  </p>

                  <ViewLocation
                    location={
                      item.location
                    }
                  />

                  <DistanceInfo
                    location={
                      item.location
                    }
                    userCoords={
                      userCoords
                    }
                  />

                  <p className="claimed-text">
                    ✅ Successfully
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
            {myDonations.length ===
            0 ? (
              <div className="glass-card empty-card">
                <h2>📋</h2>

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
                      🍱
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

                    <DistanceInfo
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
                          👤{" "}
                          <strong>
                            Receiver:
                          </strong>{" "}
                          {item
                            .claimedBy
                            ?.name ||
                            "-"}
                        </p>

                        <p>
                          📞{" "}
                          <strong>
                            Receiver Phone:
                          </strong>{" "}
                          {item
                            .claimedBy
                            ?.phone ||
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
                          ✅ Mark Distributed
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
                        ❌ Cancel Food
                      </button>
                    )}

                    {item.status ===
                      "cancelled" && (
                      <p>
                        ❌ Food
                        Cancelled
                      </p>
                    )}

                    {item.status ===
                      "distributed" && (
                      <p className="claimed-text">
                        ✅ Food Distributed
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
          `${API}/users`
        );

      setUsers(
        userResponse.data.users ||
          []
      );

      const foodResponse =
        await axios.get(
          `${API}/admin/food`
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
  }, []);

  return (
    <div className="dashboard-page admin-bg">
      <nav className="dashboard-nav">
        <div className="logo">
          🍽️ FoodSurplus
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

        {/* ==================================================
            STATISTICS
        ================================================== */}

        <div className="stats-grid">
          <div className="glass-card stat-card">
            <span>👥</span>

            <h2>
              {users.length}
            </h2>

            <p>
              Total Users
            </p>
          </div>

          <div className="glass-card stat-card">
            <span>🍱</span>

            <h2>
              {foods.length}
            </h2>

            <p>
              Total Food
            </p>
          </div>

          <div className="glass-card stat-card">
            <span>🥕</span>

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
            <span>🤝</span>

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

        {/* ==================================================
            REGISTERED USERS
        ================================================== */}

        <div className="glass-card table-card">
          <h2>
            Registered Users
          </h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Role</th>
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

        {/* ==================================================
            FOOD RECORDS
        ================================================== */}

        <div className="glass-card table-card">
          <h2>
            Food Records
          </h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Donor</th>
                  <th>Receiver</th>
                  <th>Status</th>
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
                        📞{" "}
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
                        📞{" "}
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
  // LOGIN PAGE
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