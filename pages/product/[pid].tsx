import { useState, useEffect } from 'react';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import CartButton from '../../components/CartButton';
import AddToCartButton from '../../components/AddToCartButton';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Product {
  pid: number;
  name: string;
  price: number;
  description: string;
  image: string;
  catid: number;
}

const ProductPage: React.FC = () => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { pid } = router.query;

  useEffect(() => {
    setIsClient(true);
    if (!pid) return;

    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/${pid}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        const data = await response.json();
        data.price = Number(data.price);
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
        router.push('/404');
      }
    };

    fetchProduct();
  }, [pid]);

  if (!isClient || !product) {
    return <div>Loading...</div>;
  }

  // Map catid to category URL slug and display name
  const categorySlug = product.catid === 1 ? 'smartphone' : product.catid === 2 ? 'laptop' : '';
  const categoryDisplay = product.catid === 1 ? 'Smart Phone' : product.catid === 2 ? 'Laptop' : 'Unknown Category';

  return (
    <div>
      <Head>
        <title>{product.name} - Online Store</title>
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
          <li><span>&gt;</span></li>
          <li><Link href={`/${categorySlug}`}>{categoryDisplay}</Link></li>
          <li><span>&gt;</span></li>
          <li><Link href={`/product/${product.pid}`}>{product.name}</Link></li>
        </ul>
      </section>
      <section className="product-display">
        <img src={`/uploads/${product.image}`} alt={product.name} />
        <h1>{product.name}</h1>
        <p className="price">${product.price.toFixed(2)}</p>
        <p className="short-description">{product.description}</p>
        <AddToCartButton product={product} />
      </section>
    </div>
  );
};

export default ProductPage;