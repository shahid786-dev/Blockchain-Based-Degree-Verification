import { useRef, useState } from "react";
import { formatBytes, sha256File } from "../lib/hash.js";

/**
 * Drag-and-drop / click-to-choose file input that hashes the file locally.
 * Calls onHashed({ file, hash }) once the SHA-256 is ready.
 */
export default function FileDrop({ onHashed, label = "Drop the degree PDF here", hint = "or click to choose a file" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(f) {
    if (!f) return;
    setBusy(true);
    setFile(f);
    try {
      const h = await sha256File(f);
      setHash(h);
      onHashed?.({ file: f, hash: h });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`filedrop ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/*,text/plain"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {file ? (
        <div className="filedrop-info">
          <div className="filedrop-name">
            📄 {file.name} <span className="muted">({formatBytes(file.size)})</span>
          </div>
          <div className="filedrop-hash">
            <span className="muted">SHA-256</span>{" "}
            <span className="mono">{busy ? "calculating…" : hash}</span>
          </div>
          <div className="muted small">Click to choose a different file. The file is hashed in your browser and never uploaded.</div>
        </div>
      ) : (
        <div className="filedrop-empty">
          <div className="filedrop-icon" aria-hidden="true">⇪</div>
          <div className="filedrop-label">{label}</div>
          <div className="muted small">{hint}</div>
        </div>
      )}
    </div>
  );
}
