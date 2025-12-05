import { Inter } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "VOLVOX BASE VERSION",
  description: "Built with Volvox",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthContextProvider>
          <main className="flex-1">{children}</main>
        </AuthContextProvider>
      </body>
    </html>
  );
}
