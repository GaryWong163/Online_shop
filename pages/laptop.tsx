import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';


const products = [
    {
      pid: 4,
      name: "Macbook Air",
      price: 1000,
      image: "../img/macbook.webp",
      link: "/macbookair",
    }
  ];

const OnlineStore: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [cart, setCart] = useState<{ name: string; quantity: number }[]>([]);

  useEffect(() => {
    setIsClient(true);
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
        <link rel="stylesheet" type="text/css" href="styles.css" />
      </Head>
      <Navbar />
      <CartButton />

      <section className="menu">
        <ul>
          <li><Link href="/" legacyBehavior><a>Home</a></Link></li>
          <li><span> > </span></li>
          <li><Link href="/laptop" legacyBehavior><a>Laptop</a></Link></li>
        </ul>
      </section>

      <section className="product-list">
        {products.map((product) => (
          <div key={product.pid} className="product-item">
            <a><Link href={product.link} legacyBehavior><img src={product.image} alt={product.name}/></Link></a>
            <a><Link href={product.link} legacyBehavior><p>{product.name}</p></Link></a>
            <p>${product.price}</p>
            <AddToCartButton product={product} />
          </div>
        ))}
      </section>
    </div>
  );
};

export default OnlineStore;