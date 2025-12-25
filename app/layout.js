import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import { ThemeContextProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "VOLVOX BASE VERSION",
  description: "Built with Volvox",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-black">
      <body className={`${inter.className} bg-black text-white `}>
        <AuthContextProvider>
          <ThemeContextProvider>
            <main className="flex-1">{children}</main>
          </ThemeContextProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
