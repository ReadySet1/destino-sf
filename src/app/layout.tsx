import { Inter, Quicksand } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./styles/globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "700"], // Regular and Bold
  variable: "--font-quicksand",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} ${quicksand.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <div className="fixed bottom-4 right-4">
            <ThemeSwitcher />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
} 