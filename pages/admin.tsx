import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchCategories, fetchProducts, addCategory, addProduct, deleteCategory, deleteProduct, fetchOrders } from './api';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/AdminPanel.module.css';

interface Order {
  id: number;
  user_id: string | null;
  total: number | null;
  created_at: string;
  payment_status: string | null;
  items: { pid: number; name: string; quantity: number; price: number | null }[];
}

const AdminPanel: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, productsData, ordersData] = await Promise.all([
          fetchCategories(),
          fetchProducts(),
          fetchOrders(),
        ]);
        console.log('Fetched orders:', ordersData);
        setCategories(categoriesData);
        setProducts(productsData);
        setOrders(ordersData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(`Failed to load data: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  const handleAddCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const categoryName = (event.currentTarget.elements.namedItem('categoryName') as HTMLInputElement).value;
      await addCategory(categoryName);
      const categoriesData = await fetchCategories();
      setCategories(categoriesData);
      setError('');
    } catch (err) {
      setError(`Failed to add category: ${err.message}`);
    }
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const catid = (event.currentTarget.elements.namedItem('categorySelect') as HTMLSelectElement).value;
      const name = (event.currentTarget.elements.namedItem('productName') as HTMLInputElement).value;
      const price = (event.currentTarget.elements.namedItem('productPrice') as HTMLInputElement).value;
      const description = (event.currentTarget.elements.namedItem('productDescription') as HTMLTextAreaElement).value;
      const image = (event.currentTarget.elements.namedItem('productImage') as HTMLInputElement).files?.[0];
      await addProduct(catid, name, price, description, image);
      const productsData = await fetchProducts();
      setProducts(productsData);
      setError('');
    } catch (err) {
      setError(`Failed to add product: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (catid: number) => {
    try {
      await deleteCategory(catid, async () => {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);
      });
      setError('');
    } catch (err) {
      setError(`Failed to delete category: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (pid: number) => {
    try {
      await deleteProduct(pid, async () => {
        const productsData = await fetchProducts();
        setProducts(productsData);
      });
      setError('');
    } catch (err) {
      setError(`Failed to delete product: ${err.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Admin Panel</title>
      </Head>
      <Navbar />
      <h1>Admin Panel</h1>
      {error && <p className={styles.error}>{error}</p>}

      <h2>Add Category</h2>
      <form id="categoryForm" onSubmit={handleAddCategory} className={styles.form}>
        <input type="text" id="categoryName" placeholder="Category Name" required className={styles.input} />
        <button type="submit" className={styles.button}>Add Category</button>
      </form>

      <h2>Categories</h2>
      <ul className={styles.list}>
        {categories.map((category) => (
          <li key={category.catid} className={styles.listItem}>
            {category.name}
            <button onClick={() => handleDeleteCategory(category.catid)} className={styles.deleteButton}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Add Product</h2>
      <form id="productForm" onSubmit={handleAddProduct} encType="multipart/form-data" className={styles.form}>
        <select id="categorySelect" className={styles.input}>
          {categories.map((category) => (
            <option key={category.catid} value={category.catid}>{category.name}</option>
          ))}
        </select>
        <input type="text" id="productName" placeholder="Product Name" required className={styles.input} />
        <input type="number" id="productPrice" placeholder="Price" required className={styles.input} />
        <textarea id="productDescription" placeholder="Description" required className={styles.textarea}></textarea>
        <input type="file" id="productImage" accept="image/png, image/jpeg, image/gif" className={styles.input} />
        <button type="submit" className={styles.button}>Add Product</button>
      </form>

      <h2>Product List</h2>
      <ul id="productList" className={styles.list}>
        {products.map((product) => (
          <li key={product.pid} className={styles.listItem}>
            <strong>{product.name}</strong> - ${product.price}<br />
            <em>{product.description}</em><br />
            <img src={`/Uploads/${product.image}`} width="100" alt={product.name} /><br />
            <button onClick={() => handleDeleteProduct(product.pid)} className={styles.deleteButton}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Orders</h2>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table className={styles.orderTable}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>user_id</th>
              <th>Total</th>
              <th>Products</th>
              <th>Payment Status</th>
              <th>Order Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.user_id ?? 'Guest'}</td>
                <td>${order.total != null ? order.total.toFixed(2) : '0.00'}</td>
                <td>
                  <ul>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item) => (
                        <li key={item.pid}>
                          <Link href={`/product/${item.pid}`}>
                            {item.name} (x{item.quantity}) - ${item.price != null ? item.price.toFixed(2) : '0.00'}
                          </Link>
                        </li>
                      ))
                    ) : (
                      <li>No items</li>
                    )}
                  </ul>
                </td>
                <td>{order.payment_status || 'Pending'}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;