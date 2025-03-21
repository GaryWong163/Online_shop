import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Navbar from '../../components/Navbar'; // Adjusted import path
import CartButton from '../../components/CartButton';
import AddToCartButton from '../../components/AddToCartButton';
import Link from 'next/link';

interface Product {
  pid: number;
  name: string;
  price: number;
  description: string;
  image: string;
}

interface ProductPageProps {
  product: Product;
}

const ProductPage: React.FC<ProductPageProps> = ({ product }) => {
  return (
    <div>
      <Head>
        <title>{product.name} - Online Store</title>
        <link rel="stylesheet" type="text/css" href="/pagestyles.css" />
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
          <li><Link href={product.catid === 1 ? "/smartphone" : "/laptop"}>{product.catid === 1 ? "Smart Phone" : "Laptop"}</Link></li>
          <li><span> > </span></li>
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { pid } = context.params!;
  const res = await fetch(`http://localhost:3000/api/products/${pid}`);

  if (!res.ok) {
    console.error('Failed to fetch product:', res.statusText);
    return {
      notFound: true,
    };
  }

  const product = await res.json();
  product.price = Number(product.price); // Ensure price is treated as a number

  return {
    props: {
      product,
    },
  };
};

export default ProductPage;