import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/router";

const Navbar: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      if (localStorage.getItem("loggedOut") === "true") {
        console.log("Skipping auth check due to recent logout");
        setUser("Guest");
        return;
      }

      try {
        console.log("Checking user, browser cookies:", document.cookie);
        const res = await axios.get("https://s33.ierg4210.ie.cuhk.edu.hk/auth/user", {
          withCredentials: true,
        });
        console.log("Fetched user:", res.data);
        const expectedUserId = localStorage.getItem("expectedUserId");
        if (expectedUserId && res.data.userId.toString() !== expectedUserId) {
          console.warn(
            `User ID mismatch! Expected: ${expectedUserId}, Got: ${res.data.userId}. Multiple authToken cookies may exist.`
          );
          await axios.post("https://s33.ierg4210.ie.cuhk.edu.hk/auth/logout", {}, { withCredentials: true });
          localStorage.setItem("loggedOut", "true");
          setUser("Guest");
          router.push("/login");
          return;
        }
        setUser(res.data.role === "admin" ? "Admin" : "User");
      } catch (error) {
        console.error("User not authenticated:", error.response?.data || error);
        setUser("Guest");
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      console.log("Sending logout request, browser cookies:", document.cookie);
      const response = await axios.post("https://s33.ierg4210.ie.cuhk.edu.hk/auth/logout", {}, { withCredentials: true });
      console.log("Logout response:", response.data);
      setUser("Guest");
      localStorage.setItem("loggedOut", "true");
      localStorage.removeItem("expectedUserId");
      localStorage.removeItem("lastLogin");
      localStorage.removeItem("redirectAfterLogin");
      document.cookie = "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "authToken=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "authToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error);
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
          <li><Link href="/member-portal">Member Portal</Link></li>
          {user === "Admin" && <li><Link href="/admin">Admin Panel</Link></li>}
        </ul>

        <div className="user-actions">
          {user === null ? (
            <span>Loading...</span>
          ) : (
            <>
              <span className="user-greeting">Welcome, {user}</span>
              {user !== "Guest" ? (
                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              ) : (
                <Link href="/login">
                  <button className="login-btn">Login</button>
                </Link>
              )}
              <Link href="/changepwd">
                <button className="pwd">Reset</button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;