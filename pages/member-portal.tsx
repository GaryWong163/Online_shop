import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { fetchUserOrders } from "./api";
import Navbar from "../components/Navbar"; 
import Cart from '../components/CartButton'; 
import styles from "../styles/MemberPortal.module.css";

interface Order {
  id: number;
  user_id: number;
  total: number;
  created_at: string;
  payment_status: string;
  items: Array<{
    pid: number;
    name: string;
    quantity: number;
    price: number;
  }>;
}

const MemberPortal: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserAndFetchOrders = async () => {
      try {
        // Check authentication
        const res = await axios.get("https://s33.ierg4210.ie.cuhk.edu.hk/auth/user", {
          withCredentials: true,
        });
        const userId = res.data.userId;

        if (!userId) {
          // Redirect to login if not authenticated
          router.push("/login");
          return;
        }

        // Fetch user's recent orders
        const userOrders = await fetchUserOrders();
        setOrders(userOrders);
      } catch (err) {
        console.error("Error fetching user or orders:", err.response?.data || err);
        setError("Failed to load orders. Please log in again.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchOrders();
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <Navbar />
      <div className={styles["member-portal"]}>
        <h1>Member Portal - Recent Orders</h1>
        <div className={styles.container}>
          <div className={styles["orders-section"]}>
            {orders.length === 0 ? (
              <p>No recent orders found.</p>
            ) : (
              <div className={styles["orders-list"]}>
                {orders.map((order) => (
                  <div key={order.id} className={styles["order-card"]}>
                    <h2>Order ID: {order.id}</h2>
                    <p>
                      <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Total:</strong> ${order.total.toFixed(2)}
                    </p>
                    <p>
                      <strong>Payment Status:</strong> {order.payment_status}
                    </p>
                    <h3>Items:</h3>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.pid}>
                          {item.name} - Quantity: {item.quantity} - Price: ${item.price.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Cart />
        </div>
      </div>
    </div>
  );
};

export default MemberPortal;