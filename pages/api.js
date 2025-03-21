export async function fetchCategories() {
    try {
      const response = await fetch('/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
  
  export async function fetchProducts() {
    try {
      const response = await fetch('/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return await response.json();
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }
  
  export async function addCategory(name) {
    await fetch('/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
  }
  
  export async function addProduct(catid, name, price, description, image) {
    if (!image) {
      alert("Please select an image.");
      return;
    }
  
    const formData = new FormData();
    formData.append('catid', catid);
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', description);
    formData.append('image', image);
  
    try {
      const response = await fetch('/products', {
        method: 'POST',
        body: formData
      });
  
      if (!response.ok) throw new Error('Failed to add product');
      alert("Product added successfully!");
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
  
  export async function deleteProduct(pid, callback) {
    if (!confirm("Are you sure you want to delete this product?")) return;
  
    try {
      const response = await fetch(`/products/${pid}`, {
        method: 'DELETE'
      });
  
      if (!response.ok) throw new Error('Failed to delete product');
      alert("Product deleted!");
      callback(); // Call the callback to update the state
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
  