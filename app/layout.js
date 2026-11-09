import "./globals.css";

export const metadata = { title: "Resume Ranker" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
