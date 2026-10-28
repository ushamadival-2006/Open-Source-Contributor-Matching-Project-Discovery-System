import Nav from "./Nav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page-container">{children}</main>
    </div>
  );
}
