import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function MarketingLayout() {
  return (
    <>
      <Navbar />
      <main>
        {/* React Router injects the routed page content here */}
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
