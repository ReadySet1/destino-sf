import React from "react";
import MenuBanner from "@/components/Menu";
import ProductList from "@/components/Products/ProductList";

const MenuPage = () => {
  return (
    <div>
      {/* Content for Catering page will go here */}
      <MenuBanner />
      <ProductList />
    </div>
  );
};

export default MenuPage;
