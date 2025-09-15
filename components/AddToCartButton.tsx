import React from 'react';
import eventEmitter from '../utils/events';

interface CartItem {
  pid: number;
  name: string;
  price: number;
  quantity: number;
}

type AddToCartButtonProps = {
  product: CartItem;
};

const AddToCartButton: React.FC<AddToCartButtonProps> = ({ product }) => {
  const handleAddToCart = () => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem('cart') || '[]');

    const existingProductIndex = cart.findIndex((item) => item.pid === product.pid);

    if (existingProductIndex >= 0) {
      cart[existingProductIndex].quantity += product.quantity || 1;
    } else {
      cart.push({
        ...product,
        quantity: product.quantity || 1,
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    console.log('Cart updated:', cart);
    eventEmitter.emit('cartUpdated');
  };

  return (
    <button onClick={handleAddToCart}>
      <p>Add to Cart - ${product.price.toFixed(2)}</p>
    </button>
  );
};

export default AddToCartButton;