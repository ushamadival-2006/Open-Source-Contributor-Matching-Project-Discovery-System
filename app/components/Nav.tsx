"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/skills", label: "Skills" },
  { href: "/projects", label: "Discover" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/applications", label: "Applications" },
  { href: "/admin/projects", label: "Admin" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setName(d.user?.name ?? null)).catch(() => setName(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <Link href="/" className="brand" aria-label="OpenSourceMatch home">
          <span className="brand-mark">OS</span>
          <span className="brand-copy"><strong>OpenSource</strong><small>Contributor Hub</small></span>
        </Link>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span></span><span></span><span></span>
        </button>
        <div className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <div className="nav-primary">
            {links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return <Link key={link.href} href={link.href} className={active ? "nav-link active" : "nav-link"} onClick={() => setMenuOpen(false)}>{link.label}</Link>;
            })}
          </div>
          <div className="nav-auth">
            {name ? (
              <><span className="signed-in"><span className="avatar-dot">{name.charAt(0).toUpperCase()}</span><span>{name}</span></span><button type="button" className="button button-small button-ghost" onClick={logout}>Log out</button></>
            ) : (
              <><Link href="/login" className="button button-small button-ghost">Login</Link><Link href="/register" className="button button-small button-primary">Register</Link></>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
