import React, { useEffect, useState, useRef } from "react";
import CartPopCSS from "../styles/CartPopup.module.css";
import eventEmitter from "../utils/events";
import Link from "next/link";
import { useRouter } from "next/router";

interface CartItem {
  pid: number;
  name: string;
  quantity: number;
  price: number;
}

interface Discount {
  pid: number;
  type: "buy_x_get_y_free" | "tiered_pricing";
  condition: { buy_quantity?: number; free_quantity?: number; tiers?: { quantity: number; total_price: number }[] };
  description: string;
}

const CartPopup: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [removingItemPid, setRemovingItemPid] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalFormData, setPaypalFormData] = useState<{
    invoice?: string;
    custom?: string;
    returnUrl?: string;
    cancelUrl?: string;
    items: Array<{ name: string; pid: string; amount: string; quantity: string }>;
  }>({ items: [] });
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const fetchCartItems = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const normalizedCart = cart.map((item: CartItem) => ({
      ...item,
      price: typeof item.price === "string" ? parseFloat(item.price) : item.price,
    }));
    console.log("Fetched cart items:", normalizedCart);
    setItems(normalizedCart);
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/api/discounts");
      if (!response.ok) {
        throw new Error(`Failed to fetch discounts: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error("Discounts response is not an array:", data);
        setDiscounts([]);
        return;
      }
      setDiscounts(data);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      setDiscounts([]);
    }
  };

  useEffect(() => {
    fetchCartItems();
    fetchDiscounts();
    eventEmitter.on("cartUpdated", fetchCartItems);
    return () => {
      eventEmitter.removeListener("cartUpdated", fetchCartItems);
    };
  }, []);

  const clearCart = () => {
    localStorage.setItem("cart", JSON.stringify([]));
    setItems([]);
    eventEmitter.emit("cartUpdated");
  };

  const updateQuantity = (pid: number, newQuantity: number) => {
    const updatedItems = items.map((item) =>
      item.pid === pid ? { ...item, quantity: newQuantity } : item
    );
    setItems(updatedItems);
    localStorage.setItem("cart", JSON.stringify(updatedItems));
    eventEmitter.emit("cartUpdated");
  };

  const handleQuantityChange = (pid: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(event.target.value, 10);
    if (newQuantity >= 1) {
      updateQuantity(pid, newQuantity);
    }
  };

  const removeItem = (pid: number) => {
    setRemovingItemPid(pid);
    setTimeout(() => {
      const updatedItems = items.filter((item) => item.pid !== pid);
      setItems(updatedItems);
      localStorage.setItem("cart", JSON.stringify(updatedItems));
      eventEmitter.emit("cartUpdated");
      setRemovingItemPid(null);
    }, 300);
  };

  const calculateItemTotal = (item: CartItem) => {
    const discount = discounts.find((d) => d.pid === item.pid);
    if (!discount) return item.price * item.quantity;

    if (discount.type === "buy_x_get_y_free") {
      const { buy_quantity, free_quantity } = discount.condition;
      const totalItemsPerSet = buy_quantity! + free_quantity!;
      const sets = Math.floor(item.quantity / totalItemsPerSet);
      const remainingItems = item.quantity % totalItemsPerSet;
      const itemsToPay = sets * buy_quantity! + remainingItems;
      return itemsToPay * item.price;
    } else if (discount.type === "tiered_pricing") {
      const { tiers } = discount.condition;
      const sortedTiers = tiers!.sort((a, b) => b.quantity - a.quantity);
      let remainingQuantity = item.quantity;
      let total = 0;

      while (remainingQuantity > 0) {
        const tier = sortedTiers.find((t) => t.quantity <= remainingQuantity);
        if (!tier) break;
        const sets = Math.floor(remainingQuantity / tier.quantity);
        total += sets * tier.total_price;
        remainingQuantity -= sets * tier.quantity;
      }
      total += remainingQuantity * item.price;
      return total;
    }
    return item.price * item.quantity;
  };

  const checkOut = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Validate cart items against the database
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (cart.length === 0) {
        setError("Cart is empty.");
        setIsSubmitting(false);
        return;
      }

      const pids = cart.map((item: CartItem) => item.pid);
      const response = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/api/products/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pids }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product data: ${response.status}`);
      }

      const products = await response.json();
      console.log("Fetched products from database:", products);

      const productMap = new Map<number, { name: string; price: number }>(
        products.map((p: { pid: number; name: string; price: string }) => [
          p.pid,
          {
            name: p.name,
            price: parseFloat(p.price),
          },
        ])
      );

      const validatedItems = cart
        .filter((item: CartItem) => productMap.has(item.pid))
        .map((item: CartItem) => ({
          ...item,
          name: productMap.get(item.pid)!.name,
          price: productMap.get(item.pid)!.price,
        }));

      if (validatedItems.length !== cart.length) {
        setError("Some items in your cart are invalid and have been removed.");
      }

      setItems(validatedItems);
      localStorage.setItem("cart", JSON.stringify(validatedItems));
      eventEmitter.emit("cartUpdated");

      if (validatedItems.length === 0) {
        setError("No valid items in cart.");
        setIsSubmitting(false);
        return;
      }

      let user_id: number | null = null;

      console.log("Checking user session, browser cookies:", document.cookie);
      const userResponse = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/api/get-user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      console.log("Get user response:", {
        status: userResponse.status,
        headers: Object.fromEntries(userResponse.headers.entries()),
        ok: userResponse.ok,
        body: await userResponse.clone().json().catch(() => ({})),
      });

      if (userResponse.ok) {
        const user = await userResponse.json();
        const expectedUserId = localStorage.getItem("expectedUserId");
        if (expectedUserId && user.userId.toString() !== expectedUserId) {
          console.warn(
            `User ID mismatch in checkout! Expected: ${expectedUserId}, Got: ${user.userId}. Forcing logout.`
          );
          await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/auth/logout", {
            method: "POST",
            credentials: "include",
          });
          localStorage.setItem("loggedOut", "true");
          localStorage.removeItem("expectedUserId");
          router.push("/login");
          setIsSubmitting(false);
          return;
        }
        user_id = user.userId || null;
        console.log("User fetched successfully:", user);
      } else {
        console.warn("Failed to fetch user, status:", userResponse.status);
        if (confirm("Please log in to proceed with checkout. Continue as guest?")) {
          user_id = null;
        } else {
          localStorage.setItem("redirectAfterLogin", window.location.pathname);
          router.push("/login");
          setIsSubmitting(false);
          return;
        }
      }

      console.log("Submitting cart:", validatedItems, "User ID:", user_id);
      const validateResponse = await fetch("https://s33.ierg4210.ie.cuhk.edu.hk/api/validate-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cart: validatedItems.map((item) => ({
            pid: item.pid,
            quantity: item.quantity,
          })),
          user_id,
        }),
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        throw new Error(`Order validation failed: ${errorData.error || validateResponse.status}`);
      }

      const { orderId, digest } = await validateResponse.json();
      console.log("Order validated:", { orderId, digest });

      localStorage.setItem("lastOrderId", orderId.toString());

      // Update PayPal form data
      setPaypalFormData({
        invoice: orderId.toString(),
        custom: orderId.toString(),
        returnUrl: `https://s33.ierg4210.ie.cuhk.edu.hk/success?invoice=${orderId}`,
        cancelUrl: "https://s33.ierg4210.ie.cuhk.edu.hk/cancel",
        items: validatedItems.map((item) => ({
          name: item.name,
          pid: item.pid.toString(),
          amount: (calculateItemTotal(item) / item.quantity).toFixed(2), // Use discounted unit price
          quantity: item.quantity.toString(),
        })),
      });

      // Submit the form after ensuring DOM update
      setTimeout(() => {
        if (formRef.current && document.contains(formRef.current)) {
          console.log("Submitting PayPal form via ref:", formRef.current.outerHTML);
          formRef.current.submit();
          clearCart();
        } else {
          console.error("Form is not connected to the DOM");
          setError("Failed to submit payment form. Please try again.");
          setIsSubmitting(false);
        }
      }, 100);
    } catch (error) {
      console.error("Checkout error:", error);
      setError("System error. Please try again later.");
      setIsSubmitting(false);
    }
  };

  const totalPrice = items.reduce((total, item) => total + calculateItemTotal(item), 0);

  return (
    <div className={CartPopCSS.CartPopup}>
      <h4>Shopping Cart</h4>
      {error && <p className={CartPopCSS.Error}>{error}</p>}
      <ul>
        {items.map((item) => (
          <li
            key={item.pid}
            className={`${CartPopCSS.CartItem} ${item.pid === removingItemPid ? CartPopCSS.removing : ""}`}
          >
            <Link href={`/product/${item.pid}`}>
              <span className={CartPopCSS.ItemName}>{item.name}</span>
            </Link>
            <input
              type="number"
              value={item.quantity}
              min="1"
              onChange={(event) => handleQuantityChange(item.pid, event)}
              className={CartPopCSS.QuantityInput}
            />
            <span className={CartPopCSS.ItemTime}>×</span>
            <span className={CartPopCSS.ItemPrice}>${item.price.toFixed(2)}</span>
            <span className={CartPopCSS.ItemEqual}>=</span>
            <span className={CartPopCSS.ItemTotal}>${calculateItemTotal(item).toFixed(2)}</span>
            <button className={CartPopCSS.ItemRemove} onClick={() => removeItem(item.pid)}>
              -
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p>Your cart is empty.</p>}
      <hr />
      <h2 className={CartPopCSS.TotalPrice}>Total: ${totalPrice.toFixed(2)}</h2>
      <div className={CartPopCSS.ButtonContainer}>
        <form
          id="paypal-form"
          ref={formRef}
          action={
            process.env.NEXT_PUBLIC_PAYPAL_ENV === "sandbox"
              ? "https://www.sandbox.paypal.com/cgi-bin/webscr"
              : "https://www.paypal.com/cgi-bin/webscr"
          }
          method="post"
          onSubmit={checkOut}
        >
          <input type="hidden" name="cmd" value="_cart" />
          <input type="hidden" name="upload" value="1" />
          <input type="hidden" name="business" value={process.env.NEXT_PUBLIC_PAYPAL_MERCHANT_EMAIL} />
          <input type="hidden" name="charset" value="utf-8" />
          <input type="hidden" name="currency_code" value="USD" />
          {paypalFormData.invoice && <input type="hidden" name="invoice" value={paypalFormData.invoice} />}
          {paypalFormData.custom && <input type="hidden" name="custom" value={paypalFormData.custom} />}
          {paypalFormData.returnUrl && <input type="hidden" name="return" value={paypalFormData.returnUrl} />}
          {paypalFormData.cancelUrl && <input type="hidden" name="cancel_return" value={paypalFormData.cancelUrl} />}
          {paypalFormData.items.map((item, index) => (
            <React.Fragment key={index}>
              <input type="hidden" name={`item_name_${index + 1}`} value={item.name} />
              <input type="hidden" name={`item_number_${index + 1}`} value={item.pid} />
              <input type="hidden" name={`amount_${index + 1}`} value={item.amount} />
              <input type="hidden" name={`quantity_${index + 1}`} value={item.quantity} />
            </React.Fragment>
          ))}
          <button
            type="submit"
            className={CartPopCSS.checkOutButton}
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? "Processing..." : "Checkout with PayPal"}
          </button>
        </form>
        <button className={CartPopCSS.clearButton} onClick={clearCart}>
          Clear
        </button>
      </div>
    </div>
  );
};

export default CartPopup;