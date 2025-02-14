import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import axios from "axios";
import * as jwt_decode from "jwt-decode";
import { useState } from "react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await axios.post(`${process.env.BASE_URL}/users/login`, {
        email,
        password,
      });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      location.reload();
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError("Email and password are required.");
      } else if (err.response && err.response.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  const handleGoogleLoginSuccess = (response) => {
    const userObject = jwt_decode(response.credential);
    console.log("User Info:", userObject);
    // You can further handle user data here, like sending it to your backend.
  };

  const handleGoogleLoginFailure = (error) => {
    console.error("Google Login Error:", error);
    setError("Google login failed. Please try again.");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>

        {error && <div className="error-message">{error}</div>}

        <form className="login-form" onSubmit={handleEmailPasswordLogin}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
          </div>
          <div className="input-group password-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn login-btn">
            Login
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <GoogleOAuthProvider clientId={process.env.GOOGLE_API}>
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginFailure}
            useOneTap
            type="standard"
            text="Login with Google"
          />
        </GoogleOAuthProvider>

        <div className="forgot-password">
          <a href="#!">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
