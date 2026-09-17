import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// Pre-configured municipal accounts
export const MUNICIPAL_USERS = {
  admin: {
    id: "ADM-BMC-4491",
    email: "er.kulkarni@mcgm.gov.in",
    name: "Er. Kulkarni",
    role: "admin",
    title: "Executive Hydraulic Engineer",
    badge: "SCADA Level 4 · MCGM Command",
    zone: "Greater Mumbai Metropolitan Operations",
    token: "AUTH-TOKEN-ADMIN-4491-MCGM",
  },
  worker: {
    id: "WRK-T08-4892",
    vehicle_id: "MH-03-BW-7821",
    tanker_id: "T-08",
    name: "Rajesh Patil",
    role: "worker",
    title: "Field Driver & Valve Operator",
    badge: "Crew #4892 · Tanker T-08",
    depot: "Trombay Pumping Hub #04",
    pin: "7419",
    token: "AUTH-TOKEN-WORKER-T08-7419",
  },
  citizen: {
    id: "CTZ-WARD-ME-98204",
    phone: "98204 11849",
    name: "Govandi Resident",
    role: "citizen",
    title: "Verified Mumbai Citizen",
    badge: "Consumer #CCN-8819 · Ward M/East",
    ward: "Ward M/East (Govandi / Shivaji Nagar)",
    token: "AUTH-TOKEN-CITIZEN-98204",
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("waterflow_auth_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Save session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("waterflow_auth_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("waterflow_auth_user");
    }
  }, [user]);

  // Authenticate by form credentials
  const login = async (role, identifier, secret) => {
    setLoading(true);
    // Simulate realistic asynchronous network auth check
    await new Promise((resolve) => setTimeout(resolve, 400));
    setLoading(false);

    if (role === "admin") {
      const match = MUNICIPAL_USERS.admin;
      if (identifier.toLowerCase() === match.email.toLowerCase() && secret === "admin123") {
        setUser(match);
        return { success: true, user: match };
      }
      return { success: false, error: "Invalid officer credentials. Use er.kulkarni@mcgm.gov.in / admin123" };
    }

    if (role === "worker") {
      const match = MUNICIPAL_USERS.worker;
      if (secret === "7419" || secret === match.pin) {
        setUser(match);
        return { success: true, user: match };
      }
      return { success: false, error: "Invalid driver PIN. Expected 7419" };
    }

    if (role === "citizen") {
      const match = {
        ...MUNICIPAL_USERS.citizen,
        phone: identifier || MUNICIPAL_USERS.citizen.phone,
      };
      setUser(match);
      return { success: true, user: match };
    }

    return { success: false, error: "Unknown role type" };
  };

  // 1-Click Evaluator Rapid Access
  const loginAsArchetype = (role) => {
    const targetUser = MUNICIPAL_USERS[role] || MUNICIPAL_USERS.admin;
    setUser(targetUser);
    return targetUser;
  };

  // Sign out
  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role: user?.role || null,
        login,
        loginAsArchetype,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
