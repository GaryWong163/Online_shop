import React from 'react';
import Link from 'next/link';

const Navbar: React.FC = () => {
  return (
    <header>
      <nav className="navbar">
        <ul>
          <li><Link href="/">Home</Link></li>
          <li className="category">
            <a href="#">Category</a>
            <ul className="cate">
              <li><Link href="/smartphone">Smartphone</Link></li>
              <li><Link href="/laptop">Laptop</Link></li>
            </ul>
          </li>
          <li><Link href="/admin">Admin Panel</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Navbar;