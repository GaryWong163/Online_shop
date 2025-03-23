import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/router";

const Navbar: React.FC = () => {
  const [user, setUser] = useState<string | null>(null); // Start with null to prevent flickering
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/auth/user", {
          withCredentials: true,
        });
        setUser(res.data.role === "admin" ? "Admin" : "User");
      } catch (error) {
        console.error("User not authenticated:", error.response?.data || error);
        setUser("Guest");
      }
    };

    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:3000/auth/logout", {}, { withCredentials: true });
      setUser("Guest"); // Reset to Guest after logout
      router.reload(); // Refresh page
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <header>
      <nav className="navbar">
        <ul>
          <li><Link href="/">Home</Link></li>
          <li className="category">
            <a href="#">Category</a>
            <ul className="cate">
              <li><Link href="/smartphone">Smartphone</Link></li>
              <li><Link href="/laptop">Laptop</Link></li>
            </ul>
          </li>
          {user === "Admin" && <li><Link href="/admin">Admin Panel</Link></li>}
        </ul>

        <div className="user-actions">
        {user === null ? (
          <span>Loading...</span> // Show loading state while checking authentication
        ) : (
          <>
            <span className="user-greeting">Welcome, {user}</span>
            {user !== "Guest" ? (
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            ) : (
              <Link href="/login">
                <button className="login-btn">Login</button>
              </Link>
            )}
            <Link href="/changepwd">
                <button className="pwd">reset</button>
              </Link>
          </>
        )}
      </div>
      </nav>
    </header>
  );
};

export default Navbar;
