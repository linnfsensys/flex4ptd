import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "../hooks/useAuth"; // Import the custom hook
import Home from "../pages/Home";
import Login from "../pages/Login";

function App() {
  const isLoggedIn = useAuth();

  return (
    <div className="main">
      <Routes>
        {/* Redirect to Home if logged in */}
        <Route
          path="/"
          element={isLoggedIn ? <Home /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!isLoggedIn ? <Login /> : <Navigate to="/" />}
        />
      </Routes>
    </div>
  );
}

export default App;
