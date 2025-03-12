import React, { useEffect, useState } from 'react';
import CartPopCSS from '../styles/CartPopup.module.css';
import eventEmitter from '../utils/events';
import Link from 'next/link';

interface CartItem {
  pid: number;
  name: string;
  quantity: number;
  price: number;
}

const CartPopup: React.FC = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [removingItemPid, setRemovingItemPid] = useState<number | null>(null);

  const fetchCartItems = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    setItems(cart);
  };

  useEffect(() => {
    fetchCartItems();
    eventEmitter.on('cartUpdated', fetchCartItems);

    return () => {
      eventEmitter.off('cartUpdated', fetchCartItems);
    };
  }, []);

  const clearCart = () => {
    localStorage.setItem('cart', JSON.stringify([]));
    setItems([]);
    eventEmitter.emit('cartUpdated');
  };

  const checkOut = () => {
    // Implement checkout logic here
  };

  const updateQuantity = (pid: number, newQuantity: number) => {
    const updatedItems = items.map(item => 
      item.pid === pid ? { ...item, quantity: newQuantity } : item
    );
    setItems(updatedItems);
    localStorage.setItem('cart', JSON.stringify(updatedItems));
    eventEmitter.emit('cartUpdated');
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
      const updatedItems = items.filter(item => item.pid !== pid);
      setItems(updatedItems);
      localStorage.setItem('cart', JSON.stringify(updatedItems));
      eventEmitter.emit('cartUpdated');
      setRemovingItemPid(null);
    }, 300); // 300ms matches the CSS transition duration
  };

  const totalPrice = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className={CartPopCSS.CartPopup}>
      <h4>Shopping Cart</h4>
      <ul>
        {items.map(item => (
          <li 
            key={item.pid} 
            className={`${CartPopCSS.CartItem} ${item.pid === removingItemPid ? CartPopCSS.removing : ''}`}
          >
            <Link href={`/product/${item.pid}`}>
              <span className={CartPopCSS.ItemName}>{item.name}</span>
            </Link>
            
            <input
              type="number"
              value={item.quantity}
              min="0"
              onChange={(event) => handleQuantityChange(item.pid, event)}
              className={CartPopCSS.QuantityInput}
            /> 
            <span className={CartPopCSS.ItemTime}>×</span>
            <span className={CartPopCSS.ItemPrice}>${item.price.toFixed(2)}</span>
            <span className={CartPopCSS.ItemEqual}>=</span>
            <span className={CartPopCSS.ItemTotal}>${(item.quantity * item.price).toFixed(2)}</span>
            <button className={CartPopCSS.ItemRemove} onClick={() => removeItem(item.pid)}>-</button>
          </li>
        ))}
      </ul>
      <hr />
      <h2 className={CartPopCSS.TotalPrice}>Total: ${totalPrice.toFixed(2)}</h2>
      <div className={CartPopCSS.ButtonContainer}>
        <button className={CartPopCSS.checkOutButton} onClick={checkOut}>Checkout</button>
        <button className={CartPopCSS.clearButton} onClick={clearCart}>Clear</button>
      </div>
    </div>
  );
};

export default CartPopup;