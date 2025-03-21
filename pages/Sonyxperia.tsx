import React from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';
import Link from 'next/link';

const SonyXperia: React.FC = () => {
  const product = {
    pid: 3,
    name: "Sony Xperia 1V 512GB Black",
    price: 1000,
    quantity: 1,
  };

  return (
    <div>
      <Head>
        <title>Online Store</title>
        <link rel="stylesheet" type="text/css" href="pagestyles.css" />
        <script src="script.js"></script>
      </Head>
      <header>
        <Navbar />
      </header>

      <div className="shoppingcart">
        <CartButton />
      </div>

      <section className="menu">
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><span> > </span></li>
          <li><Link href="/smartphone">Smart Phone</Link></li>
          <li><span> > </span></li>
          <li><Link href="/Sonyxperia">SonyXperia</Link></li>
        </ul>
      </section>

      <section className="product-display">
        <img src="../img/SonyXperia.jpeg" alt="Product 3" />
        <h1>{product.name}</h1>
        <p className="price">${product.price}</p>
        <p className="short-description">Key features and specifications...</p>
        <AddToCartButton product={product} />
      </section>
    </div>
  );
};

export default SonyXperia;