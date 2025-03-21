import React from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';
import Link from 'next/link';

const Iphone15ProMax: React.FC = () => {
  const product = {
    pid: 1,
    name: "Iphone 15 Pro Max 256GB Grey",
    price: 1000,
    quantity: 1,
  };

  return (
    <div>
      <Head>
        <title>Online Store</title>
        <link rel="stylesheet" type="text/css" href="pagestyles.css" />
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
          <li><Link href="Iphone15">Iphone 15 Pro Max</Link></li>
        </ul>
      </section>

      <section className="product-display">
        <img src="../img/iphone15promax.jpeg" alt="Product 1" />
        <h1>{product.name}</h1>
        <p className="price">${product.price}</p>
        <p className="short-description">Key features and specifications...</p>
        <AddToCartButton product={product} />
      </section>
    </div>
  );
};

export default Iphone15ProMax;