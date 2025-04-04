import React from "react";
import Navbar from "@/components/Navbar";
import MenuBanner from "@/components/Menu";
import ProductList from "@/components/Products/ProductList";
import Footer from "@/components/Footer";

const MenuPage = () => {
  return (
    <div>
      {/* Content for Catering page will go here */}
      <Navbar />
      <MenuBanner />
      <ProductList />

      <Footer />
    </div>
  );
};

export default MenuPage;
