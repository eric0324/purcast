// Root layout — only provides the bare HTML structure.
// Actual locale-aware layout is in [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
