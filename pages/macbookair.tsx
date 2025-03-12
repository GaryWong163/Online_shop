import React from 'react';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';
import Head from 'next/head';
import Link from 'next/link';

const MacbookAir: React.FC = () => {
  const product = {
    pid: 4,
    name: "Macbook Air",
    price: 1000,
    quantity: 1,
  };

  return (
    <div>
       <Head>
        <title>Online Store</title>
        <link rel="stylesheet" type="text/css" href="pagestyles.css" />
      </Head>
      <Navbar />
      <CartButton />

      <section className="menu">
        <ul>
          <li><a href="../index.html">Home</a></li>
          <li><span> > </span></li>
          <li><a href="../laptop.html">Laptop</a></li>
          <li><span> > </span></li>
          <li><a href="macbookair.html">Macbook Air</a></li>
        </ul>
      </section>

      <section className="product-display">
        <img src="../img/macbook.webp" alt="Macbook Air" />
        <h1>Macbook Air</h1>
        <p className="price">${product.price}</p>
        <p className="short-description">Key features and specifications...</p>
        <AddToCartButton product={product} />
      </section>
    </div>
  );
};

export default MacbookAir;