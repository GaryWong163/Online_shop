import React, { useState } from "react";
import { useRouter } from "next/router";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Browser cookies before login:", document.cookie);
      document.cookie = "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "authToken=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "authToken=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sessionID=; Path=/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

      console.log("Sending login request:", { email });
      const response = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      console.log("Login response:", {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful:", data);
        const userResponse = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/auth/user", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          localStorage.setItem("expectedUserId", userData.userId.toString());
          console.log("Stored expected userId:", userData.userId);
        }
        localStorage.removeItem("loggedOut");
        router.push(data.role === "admin" ? "/admin" : "/");
      } else {
        const errorData = await response.json();
        console.error("Login failed:", errorData);
        setError(errorData.error || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("System error. Please try again later.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleLogin}>
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
        <button type="submit">Login</button>
      </form>
      <button onClick={() => router.push("/changepwd")} className="reset-button">
        Reset Password
      </button>
      <p>
        Don&apos;t have an account?{" "}
        <a href="/signup" onClick={() => router.push("/signup")}>
          Sign Up
        </a>
      </p>
    </div>
  );
};

export default Login;