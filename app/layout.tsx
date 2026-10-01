import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARL ENGINEERS | Workforce Attendance",
  description: "ARL ENGINEERS workforce attendance system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
