import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import CartButton from '../components/CartButton';
import AddToCartButton from '../components/AddToCartButton';

interface Product {
  pid: number;
  name: string;
  price: number;
  image: string;
  link: string;
}

const OnlineStore: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/smartphones'); 
        if (!response.ok) throw new Error('Failed to fetch products');

        const data = await response.json();
        // Ensure price is treated as a number
        const parsedData = data.map((product: any) => ({
          ...product,
          price: Number(product.price),
        }));
        setProducts(parsedData);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []); // Empty dependency array ensures this runs only once

  if (!isClient) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Online Store</title>
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
            <Link href={`/product/${product.pid}`} legacyBehavior>
              <a><img src={`/uploads/${product.image}`} alt={product.name} /></a>
            </Link>
            <Link href={`/product/${product.pid}`} legacyBehavior>
              <a><p>{product.name}</p></a>
            </Link>
            <p>${product.price.toFixed(2)}</p>
            <AddToCartButton product={product} />
          </div>
        ))}
      </section>
    </div>
  );
};

export default OnlineStore;