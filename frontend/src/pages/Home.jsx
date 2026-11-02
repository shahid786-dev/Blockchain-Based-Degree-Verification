import { Link } from "react-router-dom";

const STEPS = [
  {
    n: "01",
    title: "University issues",
    body: "An approved university records the student's degree. The PDF is fingerprinted with SHA-256 in the browser; only the fingerprint goes on-chain.",
  },
  {
    n: "02",
    title: "Student shares",
    body: "The student gets a permanent certificate ID and a QR code to put on a CV, LinkedIn or a job application.",
  },
  {
    n: "03",
    title: "Anyone verifies",
    body: "An employer scans the QR or uploads the PDF. In seconds they see Genuine, Revoked or Not found. No phone calls, no waiting.",
  },
];

const WHY = [
  { title: "Can't be edited", body: "Records on the blockchain are append-only. Not even the admin can quietly change a CGPA." },
  { title: "Forgery shows up", body: "Change one character in the PDF and its fingerprint no longer matches the record." },
  { title: "No middleman", body: "Verification is a free public read. Nobody has to email the registrar's office." },
  { title: "Private by design", body: "The degree file never leaves your computer. Only its 32-byte hash is stored." },
];

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">Blockchain record-keeping · no cryptocurrency</span>
          <h1>
            Fake degrees end where <em>the record</em> begins.
          </h1>
          <p className="lead">
            DegreeChain lets universities record degrees on a tamper-proof ledger, so employers can confirm one in seconds
            instead of weeks.
          </p>
          <div className="hero-actions">
            <Link to="/verify" className="btn btn-primary btn-lg">
              Verify a degree
            </Link>
            <Link to="/university" className="btn btn-ghost btn-lg">
              I'm a university
            </Link>
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="mini-cert">
            <div className="mini-seal">✓</div>
            <div className="mini-uni">Demo University</div>
            <div className="mini-name">Ayesha Khan</div>
            <div className="mini-deg">BS Software Engineering · 2025</div>
            <div className="mini-hash mono">sha256 · 9f2c…e41a</div>
          </div>
        </div>
      </section>

      <section className="problem">
        <h2>The problem</h2>
        <p>
          Paper degrees are easy to forge and slow to check. Verifying one usually means sending it to the regulator or
          the university and waiting days or weeks, while fake-degree scandals keep surfacing across hiring, licensing
          and public office.
        </p>
      </section>

      <section className="steps">
        <h2>How it works</h2>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.n} className="step">
              <div className="step-n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="why">
        <h2>Why blockchain?</h2>
        <div className="why-grid">
          {WHY.map((w) => (
            <div key={w.title} className="why-item">
              <h4>{w.title}</h4>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
