import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { explorerUrl, formatDate, shortAddress } from "../lib/blockchain.js";

export function verifyUrl(certId) {
  return `${window.location.origin}/verify/${certId}`;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard not available */
        }
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * Shows a certificate record with its status, details and a QR code that links
 * to the public verification page. `fileMatch` (optional) shows whether an
 * uploaded file matched the on-chain hash.
 */
export default function CertificateCard({ cert, fileMatch, showQr = true }) {
  const status = cert.revoked ? "revoked" : "valid";

  return (
    <article className={`cert cert-${status}`}>
      <div className={`cert-status status-${status}`}>
        {cert.revoked ? (
          <>
            <span className="status-icon">✕</span>
            <div>
              <strong>Revoked</strong>
              <div className="small">This certificate was issued but later revoked by the university.</div>
            </div>
          </>
        ) : (
          <>
            <span className="status-icon">✓</span>
            <div>
              <strong>Genuine & valid</strong>
              <div className="small">This record exists on the blockchain and has not been altered.</div>
            </div>
          </>
        )}
      </div>

      {fileMatch !== undefined && (
        <div className={`file-match ${fileMatch ? "ok" : "bad"}`}>
          {fileMatch
            ? "✓ The uploaded file matches the document fingerprint stored on-chain."
            : "✕ The uploaded file does NOT match. It may have been edited or is a different document."}
        </div>
      )}

      <div className="cert-body">
        <div className="cert-main">
          <div className="cert-issuer">{cert.universityName || "Unknown university"}</div>
          <h3 className="cert-name">{cert.studentName}</h3>
          <div className="cert-degree">{cert.degreeTitle}</div>

          <dl className="cert-grid">
            <div>
              <dt>Roll number</dt>
              <dd>{cert.rollNumber}</dd>
            </div>
            <div>
              <dt>CGPA</dt>
              <dd>{cert.cgpa}</dd>
            </div>
            <div>
              <dt>Graduation year</dt>
              <dd>{cert.graduationYear}</dd>
            </div>
            <div>
              <dt>Recorded on</dt>
              <dd>{formatDate(cert.issuedAt)}</dd>
            </div>
          </dl>

          {cert.revoked && cert.revokeReason && (
            <div className="revoke-reason">
              <strong>Reason for revocation:</strong> {cert.revokeReason}
            </div>
          )}

          <div className="cert-tech">
            <div className="tech-row">
              <span className="tech-label">Certificate ID</span>
              <span className="mono break">{cert.certId}</span>
              <CopyButton text={cert.certId} />
            </div>
            <div className="tech-row">
              <span className="tech-label">Document hash</span>
              <span className="mono break">{cert.documentHash}</span>
            </div>
            <div className="tech-row">
              <span className="tech-label">Issued by wallet</span>
              {explorerUrl("address", cert.issuer) ? (
                <a
                  className="mono"
                  title={cert.issuer}
                  href={explorerUrl("address", cert.issuer)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(cert.issuer)}
                </a>
              ) : (
                <span className="mono" title={cert.issuer}>{shortAddress(cert.issuer)}</span>
              )}
            </div>
          </div>
        </div>

        {showQr && (
          <div className="cert-qr">
            <QRCodeSVG value={verifyUrl(cert.certId)} size={148} level="M" marginSize={1} />
            <div className="small muted">Scan to verify</div>
            <CopyButton text={verifyUrl(cert.certId)} />
          </div>
        )}
      </div>
    </article>
  );
}
