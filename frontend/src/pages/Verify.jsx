import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ZeroHash } from "ethers";
import CertificateCard from "../components/CertificateCard.jsx";
import FileDrop from "../components/FileDrop.jsx";
import { Alert, NotConfigured } from "../components/Notice.jsx";
import {
  friendlyError,
  getReadContract,
  isCertId,
  isConfigured,
  normaliseCertId,
  toCertificate,
} from "../lib/blockchain.js";

export default function Verify() {
  const { certId: routeId } = useParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("id");
  const [idInput, setIdInput] = useState(routeId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { cert } | { notFound, reason }
  const [fileMatch, setFileMatch] = useState(undefined);
  const [compareKey, setCompareKey] = useState(0);

  const lookupById = useCallback(async (rawId) => {
    const id = normaliseCertId(rawId);
    setError("");
    setResult(null);
    setFileMatch(undefined);
    if (!isCertId(id)) {
      setError("A certificate ID is 0x followed by 64 hex characters. Please check and try again.");
      return;
    }
    setLoading(true);
    try {
      const cert = toCertificate(await getReadContract().verifyCertificate(id));
      setResult(
        cert.exists
          ? { cert }
          : { notFound: true, reason: "No certificate with this ID exists on the blockchain. It may be fake or mistyped." }
      );
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeId && isConfigured()) {
      setMode("id");
      setIdInput(routeId);
      lookupById(routeId);
    }
  }, [routeId, lookupById]);

  async function lookupByFile({ hash }) {
    setError("");
    setResult(null);
    setFileMatch(undefined);
    setLoading(true);
    try {
      const contract = getReadContract();
      const certId = await contract.findByDocumentHash(hash);
      if (certId === ZeroHash) {
        setResult({
          notFound: true,
          reason:
            "This document's fingerprint is not on record. Either it was never issued through this system, or the file has been edited.",
        });
      } else {
        const cert = toCertificate(await contract.verifyCertificate(certId));
        setResult({ cert });
        setFileMatch(true);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function onSubmitId(e) {
    e.preventDefault();
    const id = normaliseCertId(idInput);
    if (isCertId(id) && id !== normaliseCertId(routeId || "")) navigate(`/verify/${id}`);
    else lookupById(idInput);
  }

  function switchMode(m) {
    setMode(m);
    setResult(null);
    setError("");
    setFileMatch(undefined);
  }

  return (
    <div className="page">
      <section className="page-head">
        <span className="eyebrow">Public verification</span>
        <h1>Verify a degree</h1>
        <p className="lead">
          Anyone can check a certificate for free. No account or wallet needed. Use the certificate ID (or scan its QR
          code), or upload the degree file itself.
        </p>
      </section>

      <NotConfigured />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === "id"} className={mode === "id" ? "active" : ""} onClick={() => switchMode("id")}>
          By certificate ID
        </button>
        <button
          role="tab"
          aria-selected={mode === "file"}
          className={mode === "file" ? "active" : ""}
          onClick={() => switchMode("file")}
        >
          By document file
        </button>
      </div>

      <div className="panel">
        {mode === "id" ? (
          <form onSubmit={onSubmitId} className="row-form">
            <input
              className="input mono"
              placeholder="0x3f9a…  (certificate ID)"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              spellCheck={false}
              aria-label="Certificate ID"
            />
            <button className="btn btn-primary" disabled={loading || !isConfigured() || !idInput.trim()}>
              {loading ? "Checking…" : "Verify"}
            </button>
          </form>
        ) : (
          <FileDrop
            key={`verify-${mode}`}
            label="Drop the degree file to verify"
            hint="PDF, image or text. It is hashed locally and compared with the blockchain record."
            onHashed={(r) => isConfigured() && lookupByFile(r)}
          />
        )}
      </div>

      <Alert kind="error" onClose={() => setError("")}>
        {error}
      </Alert>

      {loading && mode === "file" && <div className="muted center">Checking the blockchain…</div>}

      {result?.notFound && (
        <div className="cert cert-invalid">
          <div className="cert-status status-invalid">
            <span className="status-icon">!</span>
            <div>
              <strong>Not verified</strong>
              <div className="small">{result.reason}</div>
            </div>
          </div>
        </div>
      )}

      {result?.cert && (
        <>
          <CertificateCard cert={result.cert} fileMatch={fileMatch} />

          {mode === "id" && (
            <div className="panel">
              <h4>Also check the document file (optional)</h4>
              <p className="muted small">
                Got a PDF from the candidate? Drop it here to confirm it is the exact file the university registered.
              </p>
              <FileDrop
                key={`compare-${compareKey}-${result.cert.certId}`}
                label="Drop the candidate's file"
                onHashed={({ hash }) => setFileMatch(hash.toLowerCase() === result.cert.documentHash.toLowerCase())}
              />
              {fileMatch !== undefined && (
                <button
                  className="btn btn-ghost btn-sm mt"
                  onClick={() => {
                    setFileMatch(undefined);
                    setCompareKey((k) => k + 1);
                  }}
                >
                  Clear file check
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
