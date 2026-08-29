import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yu & Jin — Wedding Invitation",
  description:
    "You are invited to the wedding of Yu and Jin. September 2026, Waterloo and Kitchener, Ontario.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..700;1,6..72,400..700&family=Karla:ital,wght@0,400..700;1,400..700&family=Pinyon+Script&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
