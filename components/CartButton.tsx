import { useState, useRef } from 'react';
import CartPopup from './CartPopup';
import Image from 'next/image';
import cart from '../images/shopping-cart.png';
import CartButtonCSS from '../styles/CartButton.module.css';
import CartPopupCSS from '../styles/CartPopup.module.css';

const CartButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);
  let hoverTimeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  return (
    <div
      className={CartButtonCSS.cart_container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={cartRef}
    >
      <button className={CartButtonCSS.cart_button}>
        <Image src={cart} alt="cart" width={30} height={30} />
      </button>
      {isHovered && (
        <div className={CartPopupCSS.CartPopup}>
          <CartPopup />
        </div>
      )}
    </div>
  );
};

export default CartButton;