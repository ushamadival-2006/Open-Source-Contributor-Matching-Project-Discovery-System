import Link from "next/link";
import Layout from "./components/Layout";

const links = [
  ["01", "Manage profile", "Tell the community about your experience", "/profile"],
  ["02", "Add your skills", "Build a profile that matches real projects", "/skills"],
  ["03", "Discover projects", "Search repositories and good-first issues", "/projects"],
  ["04", "Get recommendations", "Find matches based on your expertise", "/recommendations"],
  ["05", "Track applications", "Monitor every contribution you apply for", "/applications"],
  ["06", "Admin dashboard", "Create and manage project listings", "/admin/projects"],
] as const;

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">Built for open-source communities</div>
          <h1>Find your next meaningful contribution.</h1>
          <p>Match your skills and interests with active open-source projects, discover beginner-friendly issues, and grow your developer portfolio.</p>
          <div className="hero-actions">
            <Link href="/projects" className="button button-primary">Explore projects</Link>
            <Link href="/recommendations" className="button button-ghost">View recommendations</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-card one"><strong>React · Beginner friendly</strong><div className="hero-card-line short"></div><div className="hero-card-line"></div></div>
          <div className="hero-card two"><strong>92% skill match</strong><div className="hero-card-line blue"></div><div className="hero-card-line"></div></div>
        </div>
      </section>
      <div className="dashboard-grid">
        {links.map(([number, title, copy, href]) => (
          <Link href={href} className="dashboard-link" key={href}>
            <span className="dashboard-icon">{number}</span>
            <strong>{title}</strong>
            <span>{copy}</span>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
