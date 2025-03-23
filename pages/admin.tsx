import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { fetchCategories, fetchProducts, addCategory, addProduct, deleteCategory, deleteProduct } from './api';
import Navbar from '../components/Navbar';
import Head from 'next/head';
import Link from 'next/link';

const AdminPanel: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const res = await axios.get("http://localhost:3000/auth/user", {
          withCredentials: true,
          validateStatus: (status) => status < 500, // Prevents axios from throwing errors for 401/403
        });
  
        if (res.status === 401 || res.status === 403) {
          router.replace("/login"); // 🚀 Redirect unauthorized users
          return;
        }
  
        if (res.data.role !== "admin") {
          router.replace("/login"); // 🚀 Redirect non-admin users
          return;
        }
  
        // ✅ Fetch admin data
        const categoriesData = await fetchCategories();
        const productsData = await fetchProducts();
  
        setCategories(categoriesData);
        setProducts(productsData);
        setLoading(false);
      } catch (err) {
        console.error("Access denied:", err);
        router.replace("/login"); // 🚀 Redirect on any error
      }
    };
  
    checkAuthAndFetchData();
  }, [router]);
  
  
  
  

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const handleAddCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categoryName = (event.currentTarget.elements.namedItem('categoryName') as HTMLInputElement).value;
    await addCategory(categoryName);
    const categoriesData = await fetchCategories();
    setCategories(categoriesData);
  };

  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const catid = (event.currentTarget.elements.namedItem('categorySelect') as HTMLSelectElement).value;
    const name = (event.currentTarget.elements.namedItem('productName') as HTMLInputElement).value;
    const price = (event.currentTarget.elements.namedItem('productPrice') as HTMLInputElement).value;
    const description = (event.currentTarget.elements.namedItem('productDescription') as HTMLTextAreaElement).value;
    const image = (event.currentTarget.elements.namedItem('productImage') as HTMLInputElement).files?.[0];
    await addProduct(catid, name, price, description, image);
    const productsData = await fetchProducts();
    setProducts(productsData);
  };

  const handleDeleteCategory = async (catid: number) => {
    await deleteCategory(catid, async () => {
      const categoriesData = await fetchCategories();
      setCategories(categoriesData);
    });
  };

  const handleDeleteProduct = async (pid: number) => {
    await deleteProduct(pid, async () => {
      const productsData = await fetchProducts();
      setProducts(productsData);
    });
  };

  return (
    <div>
      <Navbar />
      <h1>Admin Panel</h1>

      <h2>Add Category</h2>
      <form id="categoryForm" onSubmit={handleAddCategory}>
        <input type="text" id="categoryName" placeholder="Category Name" required />
        <button type="submit">Add Category</button>
      </form>

      <h2>Categories</h2>
      <ul>
        {categories.map((category) => (
          <li key={category.catid}>
            {category.name}
            <button onClick={() => handleDeleteCategory(category.catid)}>Delete</button>
          </li>
        ))}
      </ul>

      <h2>Add Product</h2>
      <form id="productForm" onSubmit={handleAddProduct} encType="multipart/form-data">
        <select id="categorySelect">
          {categories.map((category) => (
            <option key={category.catid} value={category.catid}>{category.name}</option>
          ))}
        </select>
        <input type="text" id="productName" placeholder="Product Name" required />
        <input type="number" id="productPrice" placeholder="Price" required />
        <textarea id="productDescription" placeholder="Description" required></textarea>
        <input type="file" id="productImage" accept="image/png, image/jpeg, image/gif" />
        <button type="submit">Add Product</button>
      </form>

      <h2>Product List</h2>
      <ul id="productList">
        {products.map((product) => (
          <li key={product.pid}>
            <strong>{product.name}</strong> - ${product.price}<br />
            <em>{product.description}</em><br />
            <img src={`/uploads/${product.image}`} width="100" alt={product.name} /><br />
            <button onClick={() => handleDeleteProduct(product.pid)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPanel;
