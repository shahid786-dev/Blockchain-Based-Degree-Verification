import { useCallback, useEffect, useState } from "react";
import CertificateCard from "../components/CertificateCard.jsx";
import FileDrop from "../components/FileDrop.jsx";
import { Alert, NotConfigured } from "../components/Notice.jsx";
import RequireWallet from "../components/RequireWallet.jsx";
import { useWallet } from "../context/WalletContext.jsx";
import { formatDate, friendlyError, getReadContract, getWriteContract, isConfigured, toCertificate } from "../lib/blockchain.js";

const EMPTY_FORM = { studentName: "", rollNumber: "", degreeTitle: "", cgpa: "", graduationYear: String(new Date().getFullYear()) };

function IssueForm({ signer, onIssued }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [doc, setDoc] = useState(null); // { file, hash }
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setIssued(null);

    if (!doc) return setError("Please attach the degree file. Its fingerprint is what gets stored on-chain.");
    const year = Number(form.graduationYear);
    if (!Number.isInteger(year) || year < 1947 || year > 2100) return setError("Enter a valid graduation year.");
    const cgpa = Number(form.cgpa);
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 4) return setError("CGPA should be between 0.00 and 4.00.");

    setBusy(true);
    try {
      const contract = getWriteContract(signer);
      const tx = await contract.issueCertificate(
        form.studentName.trim(),
        form.rollNumber.trim(),
        form.degreeTitle.trim(),
        cgpa.toFixed(2),
        year,
        doc.hash
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((ev) => ev?.name === "CertificateIssued");

      const certId = event.args.certId;
      const cert = toCertificate(await getReadContract().verifyCertificate(certId));
      setIssued(cert);
      setForm(EMPTY_FORM);
      setDoc(null);
      setFileKey((k) => k + 1);
      onIssued?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h3>Issue a new degree</h3>
      <p className="muted small">
        The student's details and the file's SHA-256 fingerprint are written to the blockchain. Once recorded they
        cannot be edited, only revoked.
      </p>

      <form onSubmit={submit} className="form-grid">
        <label>
          Student name
          <input className="input" value={form.studentName} onChange={set("studentName")} required placeholder="Ali Raza" />
        </label>
        <label>
          Roll / registration number
          <input className="input" value={form.rollNumber} onChange={set("rollNumber")} required placeholder="CS-2021-045" />
        </label>
        <label className="span-2">
          Degree title
          <input className="input" value={form.degreeTitle} onChange={set("degreeTitle")} required placeholder="BS Computer Science" />
        </label>
        <label>
          CGPA
          <input className="input" type="number" step="0.01" min="0" max="4" value={form.cgpa} onChange={set("cgpa")} required placeholder="3.45" />
        </label>
        <label>
          Graduation year
          <input className="input" type="number" min="1947" max="2100" value={form.graduationYear} onChange={set("graduationYear")} required />
        </label>
        <div className="span-2">
          <span className="label-text">Degree document</span>
          <FileDrop key={fileKey} onHashed={setDoc} />
        </div>
        <div className="span-2">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Waiting for confirmation…" : "Issue certificate"}
          </button>
        </div>
      </form>

      <Alert kind="error" onClose={() => setError("")}>
        {error}
      </Alert>

      {issued && (
        <div className="issued">
          <Alert kind="success">
            Certificate recorded on the blockchain. Share the QR code or ID with the student.
          </Alert>
          <CertificateCard cert={issued} />
        </div>
      )}
    </div>
  );
}

function IssuedList({ address, signer, refreshKey }) {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revoking, setRevoking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const c = getReadContract();
      const ids = await c.getCertificatesByUniversity(address);
      const rows = await Promise.all([...ids].reverse().map(async (id) => toCertificate(await c.verifyCertificate(id))));
      setCerts(rows);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function revoke(cert) {
    const reason = window.prompt(`Revoke the degree of ${cert.studentName} (${cert.rollNumber})?\n\nEnter a reason:`);
    if (!reason || !reason.trim()) return;
    setRevoking(cert.certId);
    setError("");
    try {
      const tx = await getWriteContract(signer).revokeCertificate(cert.certId, reason.trim());
      await tx.wait();
      await load();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setRevoking("");
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? certs.filter((c) =>
        [c.studentName, c.rollNumber, c.degreeTitle, c.certId].some((v) => v.toLowerCase().includes(q))
      )
    : certs;

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Issued certificates ({certs.length})</h3>
        <input className="input input-sm" placeholder="Search name, roll no, ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Alert kind="error" onClose={() => setError("")}>
        {error}
      </Alert>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="muted">{certs.length ? "No matches." : "No certificates issued yet."}</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll no.</th>
                <th>Degree</th>
                <th>CGPA</th>
                <th>Issued</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.certId}>
                  <td>{c.studentName}</td>
                  <td className="mono">{c.rollNumber}</td>
                  <td>{c.degreeTitle}</td>
                  <td>{c.cgpa}</td>
                  <td className="small">{formatDate(c.issuedAt)}</td>
                  <td>
                    <span className={`badge ${c.revoked ? "badge-bad" : "badge-ok"}`}>{c.revoked ? "Revoked" : "Valid"}</span>
                  </td>
                  <td className="actions">
                    <a className="btn btn-ghost btn-xs" href={`/verify/${c.certId}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                    {!c.revoked && (
                      <button className="btn btn-danger btn-xs" disabled={revoking === c.certId} onClick={() => revoke(c)}>
                        {revoking === c.certId ? "Revoking…" : "Revoke"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function University() {
  const { address, signer, role } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">University portal</span>
        <h1>{role.isUniversity ? role.universityName : "Issue degrees"}</h1>
        <p className="lead">Approved universities record degrees here. Each one gets a permanent ID and QR code.</p>
      </section>

      <NotConfigured />

      {isConfigured() && (
        <RequireWallet purpose="Connect the wallet that belongs to your university to issue or revoke certificates.">
          {!role.isUniversity ? (
            <Alert kind="warn">
              This wallet is not registered as a university. Ask the registry admin to approve{" "}
              <span className="mono">{address}</span> on the Admin page.
            </Alert>
          ) : (
            <>
              {!role.universityActive && (
                <Alert kind="warn">
                  Your university is currently suspended by the regulator. You can still view and revoke existing
                  certificates, but you cannot issue new ones.
                </Alert>
              )}
              {role.universityActive && <IssueForm signer={signer} onIssued={() => setRefreshKey((k) => k + 1)} />}
              <IssuedList address={address} signer={signer} refreshKey={refreshKey} />
            </>
          )}
        </RequireWallet>
      )}
    </div>
  );
}
