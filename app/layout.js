import "./globals.css";

export const metadata = {
  title: "MintCat",
  description: "MintCat is a federated social media web app focused on open participation, portable identity, and community self-governance."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}