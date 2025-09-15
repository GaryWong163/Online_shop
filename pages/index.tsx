// /pages/index.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';

const OnlineStore: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [cart, setCart] = useState<{ name: string; quantity: number }[]>([]);

  useEffect(() => {
    setIsClient(true);

    // Initialize Facebook SDK
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.XFBML.parse(); // Parse FBML tags after component mounts
    } else {
      // Load SDK dynamically
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.FB.init({
          xfbml: true,
          version: 'v20.0', // Use latest version
        });
        window.FB.XFBML.parse();
      };
      document.head.appendChild(script);
    }
  }, []);

  const addToCart = (productName: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.name === productName);
      if (existingItem) {
        return prevCart.map((item) =>
          item.name === productName ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { name: productName, quantity: 1 }];
      }
    });
  };

  if (!isClient) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Online Store</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" href="/styles.css" />
      </Head>
      <Navbar />
      <CartButton />

      <section className="menu">
        <ul>
          <li><Link href="/">Home</Link></li>
        </ul>
      </section>

      <section>
        <div
          className="fb-post"
          data-href="https://www.facebook.com/MetaHK/posts/pfbid0XCJmHrRVYSqhqQrWup1Bx12nYx9Z8UupzZ2TfrNkSWrvhnbwi2VaAHc4wz2TUmybl"
          data-width="500"
        ></div>
      </section>
    </div>
  );
};

export default OnlineStore;