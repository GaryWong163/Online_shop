document.addEventListener('DOMContentLoaded', () => {
    fetchCategories();
    fetchProducts();

    const categoryForm = document.getElementById('categoryForm');
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = document.getElementById('categoryName').value;
        await addCategory(categoryName);
        fetchCategories();
    });

    const productForm = document.getElementById('productForm');
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catid = document.getElementById('categorySelect').value;
        const name = document.getElementById('productName').value;
        const price = document.getElementById('productPrice').value;
        const description = document.getElementById('productDescription').value;
        const image = document.getElementById('productImage').files[0];
        await addProduct(catid, name, price, description, image);
        fetchProducts();
    });
});

async function fetchCategories() {
    try {
        const response = await fetch('/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const categories = await response.json();

        const categorySelect = document.getElementById('categorySelect');
        categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>'; 

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.catid;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });

        console.log('Categories Loaded:', categories); 
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}


async function fetchProducts() {
    try {
        const response = await fetch('/products');
        if (!response.ok) throw new Error('Failed to fetch products');
        const products = await response.json();

        const productList = document.getElementById('productList');
        productList.innerHTML = '';

        products.forEach(product => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${product.name}</strong> - $${product.price}<br>
                <em>${product.description}</em><br>
                <img src="/uploads/${product.image}" width="100" alt="${product.name}"><br>
                <button onclick="deleteProduct(${product.pid})">Delete</button>
            `;
            productList.appendChild(li);
        });

        console.log('Products Loaded:', products); 
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}


async function addCategory(name) {
    await fetch('/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    });
}

async function addProduct(catid, name, price, description, image) {
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
        fetchProducts();
    } catch (error) {
        console.error('Error adding product:', error);
    }
}

async function deleteProduct(pid) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const response = await fetch(`/products/${pid}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete product');
        alert("Product deleted!");
        fetchProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}
