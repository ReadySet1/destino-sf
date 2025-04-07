"use client";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { create } from "zustand";

interface CartAlertStore {
  isVisible: boolean;
  message: string;
  showAlert: (message: string) => void;
  hideAlert: () => void;
}

export const useCartAlertStore = create<CartAlertStore>((set) => ({
  isVisible: false,
  message: "",
  showAlert: (message: string) => {
    set({ isVisible: true, message });
    setTimeout(() => {
      set({ isVisible: false, message: "" });
    }, 3000);
  },
  hideAlert: () => set({ isVisible: false, message: "" }),
}));

export function CartAlert() {
  const { isVisible, message } = useCartAlertStore();
  

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] w-96 animate-in duration-300 fade-in-0 slide-in-from-top">
      <Alert className="border-[#FF9F1C] bg-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-[#FF9F1C]" />
        <AlertTitle className="text-black font-medium">Added to Cart!</AlertTitle>
        <AlertDescription className="text-gray-600">
          {message}
        </AlertDescription>
      </Alert>
    </div>
  );
} 