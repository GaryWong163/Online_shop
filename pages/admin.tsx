import React, { useState, useEffect } from 'react';
import { fetchCategories, fetchProducts, addCategory, addProduct, deleteProduct } from './api';
import Navbar from '../components/Navbar';

const AdminPanel: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData);

        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }

    loadData();
  }, []);

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