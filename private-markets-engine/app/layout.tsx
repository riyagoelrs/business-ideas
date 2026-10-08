import "./globals.css";

export const metadata = {
  title: "Signal — Private Markets Intelligence",
  description: "AI-native private markets research from your phone"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
