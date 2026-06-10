"use client";

import type { StoredFile } from "@lms/api-contracts";
import { Upload } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "../../components/auth/auth-provider";
import { AppShell } from "../../components/layout/app-shell";
import { listFiles, uploadFile } from "../../lib/api";

function ProfileContent() {
  const { accessToken, user } = useAuth();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = user?.role === "Candidate";
  const uploadModule = isCandidate ? "candidates" : "submissions";

  const loadFiles = async () => {
    if (!accessToken) {
      return;
    }

    const data = await listFiles(accessToken, { module: uploadModule });
    setFiles(data);
  };

  useEffect(() => {
    void loadFiles().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load files.");
    });
  }, [accessToken]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!accessToken || !selectedFile) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      await uploadFile(accessToken, {
        file: selectedFile,
        module: uploadModule,
      });
      setMessage(`Uploaded ${selectedFile.name}.`);
      setSelectedFile(null);
      await loadFiles();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload file.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <AppShell contentClassName="profile-page" title="My Files">
      {(error || message) && (
        <section className="feedback-row" aria-live="polite">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && <p className="form-success">{message}</p>}
        </section>
      )}

      <section className="grid daily-logs-grid review-mode">
        <article className="card panel">
          <h2>Upload File</h2>
          <form className="stack-form" onSubmit={handleUpload}>
            <label>
              Choose file
              <input
                className="plain-input"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                required
                type="file"
              />
            </label>
            <button className="command-button primary" disabled={isBusy || !selectedFile} type="submit">
              <Upload size={18} aria-hidden="true" />
              Upload
            </button>
          </form>
        </article>

        <article className="card panel">
          <h2>Uploaded Files</h2>
          <div className="daily-log-list">
            {files.length === 0 && <p className="row-meta">No files uploaded yet.</p>}
            {files.map((file) => (
              <div className="daily-log-row" key={file.id}>
                <div className="daily-log-main">
                  <div>
                    <p className="row-title">{file.originalName}</p>
                    <p className="row-meta">
                      {(file.sizeBytes / 1024).toFixed(1)} KB / {file.mimeType}
                    </p>
                  </div>
                </div>
                {file.downloadUrl && (
                  <a className="command-button" href={file.downloadUrl} rel="noreferrer" target="_blank">
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

export default function ProfilePage() {
  return <ProfileContent />;
}
