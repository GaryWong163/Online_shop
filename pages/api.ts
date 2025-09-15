export const fetchCategories = async () => {
    const response = await fetch('/categories', {
      credentials: 'include',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
};
  
export const fetchProducts = async () => {
    const response = await fetch('/products', {
      credentials: 'include',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json();
};
  
export const addCategory = async (name: string) => {
    const response = await fetch('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add category: ${response.status} ${response.statusText} - ${errorText}`);
    }
};
  
export const addProduct = async (
    catid: string,
    name: string,
    price: string,
    description: string,
    image?: File
) => {
    const formData = new FormData();
    formData.append('catid', catid);
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', description);
    if (image) {
      formData.append('image', image);
    }
    const response = await fetch('/products', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add product: ${response.status} ${response.statusText} - ${errorText}`);
    }
};
  
export const deleteCategory = async (catid: number, callback: () => void) => {
    const response = await fetch(`/categories/${catid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete category: ${response.status} ${response.statusText} - ${errorText}`);
    }
    callback();
};
  
export const deleteProduct = async (pid: number, callback: () => void) => {
    const response = await fetch(`/products/${pid}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete product: ${response.status} ${response.statusText} - ${errorText}`);
    }
    callback();
};
  
export const fetchOrders = async (): Promise<Order[]> => {
    const response = await fetch('/api/orders', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    const data = await response.json();
    console.log('Raw /api/orders response:', data);
    return data.map((order: any) => ({
      id: order.id,
      user_id: order.user_id,
      total: order.total,
      created_at: order.created_at,
      payment_status: order.payment_status,
      items: order.items || [],
    }));
};

export const fetchUserOrders = async (): Promise<Order[]> => {
    const response = await fetch('/api/user-orders', {
      credentials: 'include',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user orders: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Raw /api/user-orders response:', data);
    return data.map((order: any) => ({
      id: order.id,
      user_id: order.user_id,
      total: order.total,
      created_at: order.created_at,
      payment_status: order.payment_status,
      items: order.items || [],
    }));
};