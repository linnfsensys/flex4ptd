import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "../hooks/useAuth"; // Import the custom hook
import Home from "../pages/Home";
import Login from "../pages/Login";
import { useEffect } from 'react';
import webSocketService from '../services/WebSocketService';

function App() {
  const isLoggedIn = useAuth();

  useEffect(() => {
    try {
      // 连接WebSocket
      webSocketService.connect();

      // 测试发送消息
      const testConnection = setTimeout(() => {
        if (webSocketService.isConnected) {
          try {
            webSocketService.send({
              type: 'getConfig',
              data: {
                deviceId: 'test-device'
              }
            });
          } catch (error) {
            console.error('Failed to send test message:', error);
          }
        } else {
          console.log('WebSocket not connected, skipping test message');
        }
      }, 2000);

      return () => {
        clearTimeout(testConnection);
        webSocketService.disconnect();
      };
    } catch (error) {
      console.error('WebSocket setup failed:', error);
    }
  }, []);

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
