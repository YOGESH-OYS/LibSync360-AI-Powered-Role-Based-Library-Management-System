import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { setSessionExpiredHandler } from "../services/api";

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case "UPDATE_USER":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        dispatch({ type: "AUTH_START" });
        const response = await api.get("/auth/me");
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user: response.data.user },
        });
      } catch (error) {
        const isSessionExpired =
          error.response?.status === 401 &&
          error.response?.data?.message
            ?.toLowerCase()
            .includes("session expired");
        if (isSessionExpired) {
          setSessionExpired(true);
        } else {
          // Do not log out for other errors (e.g., network/server error)
          dispatch({ type: "AUTH_FAILURE", payload: null });
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      // Only show popup if user was authenticated
      if (state.isAuthenticated) {
        setSessionExpired(true);
      }
    });
  }, [state.isAuthenticated]);

  const handleSessionExpired = () => {
    setSessionExpired(false);
    // Clear auth state
    dispatch({ type: "LOGOUT" });
    // Clear any stored tokens
    localStorage.removeItem("token");
    // Clear any stored user data
    sessionStorage.clear();
    // Redirect to login
    navigate("/login");
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await api.post("/auth/login", credentials);
      const { user } = response.data;
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user },
      });
      toast.success(`Welcome back, ${user.firstName}!`);
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "staff") {
        navigate("/staff");
      } else {
        navigate("/dashboard");
      }
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = await api.post("/auth/register", userData);
      const { user } = response.data;
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user },
      });
      toast.success("Registration successful!");
      navigate("/dashboard");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Registration failed";
      dispatch({ type: "AUTH_FAILURE", payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    dispatch({ type: "LOGOUT" });
    toast.success("Logged out successfully");
    navigate("/");
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put("/users/profile", profileData);
      dispatch({ type: "UPDATE_USER", payload: response.data });
      toast.success("Profile updated successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Profile update failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      await api.put("/users/change-password", passwordData);
      toast.success("Password changed successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Password change failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {sessionExpired && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md mx-4">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Session Expired
              </h2>
              <p className="text-gray-600">
                Your session has expired due to inactivity. Please log in again
                to continue.
              </p>
            </div>
            <button
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={handleSessionExpired}
            >
              Continue to Login
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
