import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';

const products = [
  {
    pid: 1,
    name: "Iphone 15 pro max 256GB Grey",
    price: 1000,
    image: "img/iphone15promax.jpeg",
    link: "produt_page/Iphone15.html",
  },
  {
    pid: 2,
    name: "Samsung Flip 5 512GB Green",
    price: 1000,
    image: "img/SamsungFlip5.jpeg",
    link: "produt_page/Samsungflip.html",
  },
  {
    pid: 3,
    name: "Sony Xperia 1V 512GB Black",
    price: 1000,
    image: "img/SonyXperia.jpeg",
    link: "produt_page/Sonyxperia.html",
  },
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
        <script src="script.js"></script>
      </Head>
      <Navbar />
      <CartButton />

      <section className="menu">
        <ul>
          <li><Link href="/" legacyBehavior><a>Home</a></Link></li>
          <li><span> > </span></li>
          <li><Link href="/smartphone" legacyBehavior><a>Smartphone</a></Link></li>
        </ul>
      </section>

      <section className="product-list">
        {products.map((product) => (
          <div key={product.pid} className="product-item">
            <a href={product.link}><img src={product.image} alt={product.name} /></a>
            <a href={product.link}><p>{product.name}</p></a>
            <p>${product.price}</p>
            <AddToCartButton product={product} />
          </div>
        ))}
      </section>
    </div>
  );
};

export default OnlineStore;