import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// ==================================================
// DEPLOYED BACKEND
// ==================================================
const API = "https://foodsurplussystem.onrender.com/api";

// ==================================================
// LOGIN COMPONENT
// ==================================================
function Login({ onLogin, goRegister, goAdminLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      setMessage("Login successful!");
      onLogin(response.data.user);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Login failed"
      );
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Login to FoodSurplus</p>

        {message && <div className="message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="primary-btn" type="submit">
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
function AdminLogin({ onLogin, goLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      if (response.data.user?.role !== "admin") {
        setMessage("Access denied. Admin account required.");
        return;
      }

      setMessage("Admin login successful!");
      onLogin(response.data.user);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Admin login failed"
      );
    }
  };

  return (
    <div className="page-background login-bg">
      <div className="glass-card auth-card">
        <div className="hero-icon">🔐</div>

        <h1>Admin Login</h1>
        <p className="subtitle">
          FoodSurplus Administration
        </p>

        {message && <div className="message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="primary-btn" type="submit">
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
// REGISTER COMPONENT
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

      setMessage(
        response.data.message ||
          "Registration successful!"
      );

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
        <p className="subtitle">Join FoodSurplus</p>

        {message && <div className="message">{message}</div>}

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
            placeholder="Address"
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
// HOME COMPONENT
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
          <div className="hero-icon">🍲</div>

          <p className="tagline">
            SMART FOOD REDISTRIBUTION
          </p>

          <h1>Food Surplus System</h1>

          <p className="hero-description">
            Connecting surplus food with people
            who need it. Together, we can reduce
            food waste and help communities.
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
// DONOR DASHBOARD
// ==================================================
function DonorDashboard({ user, logout }) {
  const [food, setFood] = useState({
    foodName: "",
    foodType: "Veg",
    quantity: "",
    unit: "plates",
    description: "",
    location: "",
    expiryTime: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFood({
      ...food,
      [e.target.name]: e.target.value,
    });
  };

  const addFood = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await axios.post(`${API}/food`, {
        donorId: user.id || user._id,
        ...food,
        quantity: Number(food.quantity),
      });

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
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to donate food"
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
            DONOR
          </span>

          <button onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>Donor Dashboard</h1>

        <p className="welcome">
          Welcome, <strong>{user.name}</strong>
        </p>

        <div className="glass-card dashboard-card">
          <h2>🍱 Donate Surplus Food</h2>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          <form onSubmit={addFood}>
            <input
              name="foodName"
              placeholder="Food Name"
              value={food.foodName}
              onChange={handleChange}
              required
            />

            <select
              name="foodType"
              value={food.foodType}
              onChange={handleChange}
            >
              <option value="Veg">Veg</option>
              <option value="Non-Veg">
                Non-Veg
              </option>
            </select>

            <div className="two-column">
              <input
                type="number"
                name="quantity"
                placeholder="Quantity"
                value={food.quantity}
                onChange={handleChange}
                required
              />

              <select
                name="unit"
                value={food.unit}
                onChange={handleChange}
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
              value={food.location}
              onChange={handleChange}
              required
            />

            <input
              type="datetime-local"
              name="expiryTime"
              value={food.expiryTime}
              onChange={handleChange}
              required
            />

            <textarea
              name="description"
              placeholder="Description"
              value={food.description}
              onChange={handleChange}
            />

            <button
              className="primary-btn"
              type="submit"
            >
              Donate Food
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// RECEIVER DASHBOARD
// ==================================================
function ReceiverDashboard({ user, logout }) {
  const [foods, setFoods] = useState([]);
  const [claimed, setClaimed] = useState([]);
  const [tab, setTab] = useState("available");
  const [message, setMessage] = useState("");

  const userId = user.id || user._id;

  const loadFoods = async () => {
    try {
      const response = await axios.get(
        `${API}/food`
      );

      setFoods(
        response.data.foods || []
      );
    } catch (error) {
      console.log(error);
    }
  };

  const loadClaimed = async () => {
    try {
      const response = await axios.get(
        `${API}/food/receiver/${userId}`
      );

      setClaimed(
        response.data.foods || []
      );
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadFoods();
    loadClaimed();
  }, []);

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

      loadFoods();
      loadClaimed();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to claim food"
      );
    }
  };

  return (
    <div className="dashboard-page receiver-bg">
      <nav className="dashboard-nav">
        <div className="logo">
          🍽️ FoodSurplus
        </div>

        <div>
          <span className="role-badge">
            RECEIVER
          </span>

          <button onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>Receiver Dashboard</h1>

        <p className="welcome">
          Welcome, <strong>{user.name}</strong>
        </p>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        <div className="tabs">
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
            Available Food
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
            My Claimed Food
          </button>
        </div>

        {tab === "available" && (
          <div className="food-grid">
            {foods.length === 0 ? (
              <div className="glass-card empty-card">
                <h2>🍽️</h2>
                <p>
                  No food currently available.
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

                  <h2>{item.foodName}</h2>

                  <p>
                    <strong>Type:</strong>{" "}
                    {item.foodType}
                  </p>

                  <p>
                    <strong>Quantity:</strong>{" "}
                    {item.quantity}{" "}
                    {item.unit}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {item.location}
                  </p>

                  {item.description && (
                    <p>
                      {item.description}
                    </p>
                  )}

                  <button
                    className="primary-btn"
                    onClick={() =>
                      claimFood(item._id)
                    }
                  >
                    Claim Food
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "claimed" && (
          <div className="food-grid">
            {claimed.length === 0 ? (
              <div className="glass-card empty-card">
                <h2>📦</h2>

                <p>
                  No claimed food yet.
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

                  <h2>{item.foodName}</h2>

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

                  <p className="claimed-text">
                    Successfully Claimed
                  </p>
                </div>
              ))
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
function AdminDashboard({ user, logout }) {
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);

  const loadData = async () => {
    try {
      const userResponse =
        await axios.get(`${API}/users`);

      setUsers(
        userResponse.data.users || []
      );

      const foodResponse =
        await axios.get(`${API}/food`);

      setFoods(
        foodResponse.data.foods || []
      );
    } catch (error) {
      console.log(error);
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

          <button onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <h1>Admin Dashboard</h1>

        <p className="welcome">
          Welcome, <strong>{user.name}</strong>
        </p>

        <div className="stats-grid">
          <div className="glass-card stat-card">
            <span>👥</span>
            <h2>{users.length}</h2>
            <p>Total Users</p>
          </div>

          <div className="glass-card stat-card">
            <span>🍱</span>
            <h2>{foods.length}</h2>
            <p>Total Food</p>
          </div>

          <div className="glass-card stat-card">
            <span>🥕</span>

            <h2>
              {users.filter(
                (u) =>
                  u.role === "donor"
              ).length}
            </h2>

            <p>Donors</p>
          </div>

          <div className="glass-card stat-card">
            <span>🤝</span>

            <h2>
              {users.filter(
                (u) =>
                  u.role === "receiver"
              ).length}
            </h2>

            <p>Receivers</p>
          </div>
        </div>

        <div className="glass-card table-card">
          <h2>Registered Users</h2>

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
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.phone || "-"}
                    </td>
                    <td>
                      {u.address || "-"}
                    </td>
                    <td>{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card table-card">
          <h2>Food Records</h2>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {foods.map((food) => (
                  <tr key={food._id}>
                    <td>
                      {food.foodName}
                    </td>

                    <td>
                      {food.foodType}
                    </td>

                    <td>
                      {food.quantity}{" "}
                      {food.unit}
                    </td>

                    <td>
                      {food.location}
                    </td>

                    <td>
                      {food.status || "available"}
                    </td>
                  </tr>
                ))}
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
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);

    if (loggedUser.role === "admin") {
      setPage("admin");
    } else if (
      loggedUser.role === "donor"
    ) {
      setPage("donor");
    } else {
      setPage("receiver");
    }
  };

  const handleAdminLogin = (loggedUser) => {
    if (loggedUser.role !== "admin") {
      return;
    }

    setUser(loggedUser);
    setPage("admin");
  };

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
        onLogin={handleLogin}
        goRegister={() =>
          setPage("register")
        }
        goAdminLogin={() =>
          setPage("admin-login")
        }
      />
    );
  }

  // ==================================================
  // ADMIN LOGIN
  // ==================================================
  if (page === "admin-login") {
    return (
      <AdminLogin
        onLogin={handleAdminLogin}
        goLogin={() =>
          setPage("login")
        }
      />
    );
  }

  // ==================================================
  // REGISTER
  // ==================================================
  if (page === "register") {
    return (
      <Register
        goLogin={() =>
          setPage("login")
        }
      />
    );
  }

  // ==================================================
  // DONOR
  // ==================================================
  if (
    page === "donor" &&
    user
  ) {
    return (
      <DonorDashboard
        user={user}
        logout={logout}
      />
    );
  }

  // ==================================================
  // RECEIVER
  // ==================================================
  if (
    page === "receiver" &&
    user
  ) {
    return (
      <ReceiverDashboard
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
        setPage("register")
      }
      goAdminLogin={() =>
        setPage("admin-login")
      }
    />
  );
}

export default App;