"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROLES } from "../lib/jds";

const CLASS_LABEL = {
  lca: "LCA match",
  ux: "UI/UX match",
  both: "Strong match for both",
  uncertain: "Needs review",
  neither: "Low match",
};
const ACCEPTED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md"]);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function makeErrorResult(fileName, error, id = `error-${Date.now()}-${Math.random()}`) {
  return {
    id,
    fileName,
    name: fileName,
    source: "upload",
    status: "error",
    error,
  };
}

export default function Page() {
  const [pile, setPile] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState("LCA");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("score");
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [lastUploadId, setLastUploadId] = useState(null);
  const localUrls = useRef(new Map());

  const loadPile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pile", { cache: "no-store" });
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("The server returned an invalid response.");
      setPile(data);
    } catch (error) {
      setPile([
        {
          id: "pile-error",
          fileName: "data/resumes",
          name: "Resume folder",
          source: "pile",
          status: "error",
          error: `Could not load the resume folder. ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPile();
    return () => {
      for (const url of localUrls.current.values()) URL.revokeObjectURL(url);
      localUrls.current.clear();
    };
  }, [loadPile]);

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setBusy(true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        setProgress(`Processing ${index + 1} of ${files.length}: ${file.name}`);

        const id = `upload-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
        localUrls.current.set(id, URL.createObjectURL(file));

        if (!ACCEPTED_EXTENSIONS.has(getExtension(file.name))) {
          setUploads((current) => [
            ...current,
            makeErrorResult(file.name, "Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.", id),
          ]);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setUploads((current) => [...current, makeErrorResult(file.name, "The file exceeds the 15 MB upload limit.", id)]);
          continue;
        }
        if (file.size === 0) {
          setUploads((current) => [...current, makeErrorResult(file.name, "The uploaded file is empty.", id)]);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);

        let result;
        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
          });
          const payload = await response.json().catch(() => null);

          if (payload && typeof payload === "object" && !Array.isArray(payload)) {
            result = payload;
            if (!response.ok && !result.error) {
              result = makeErrorResult(file.name, `The server returned ${response.status}.`);
            }
          } else {
            result = makeErrorResult(file.name, `The server returned an invalid response (${response.status}).`);
          }
        } catch (error) {
          result = makeErrorResult(file.name, `Could not reach the server. ${error.message}`);
        }

        if (result.status !== "ok" && result.status !== "error") {
          result = makeErrorResult(file.name, result.error || "The file could not be analyzed.");
        }
        result = {
          ...result,
          id: result.id || id,
          fileName: result.fileName || file.name,
          name: result.name || file.name,
          source: "upload",
        };
        const localUrl = localUrls.current.get(id);
        if (result.id !== id) localUrls.current.delete(id);
        localUrls.current.set(result.id, localUrl);
        setUploads((current) => [...current, result]);
        setLastUploadId(result.id);
      }
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, []);

  const all = useMemo(() => [...pile, ...uploads], [pile, uploads]);
  const successful = useMemo(() => all.filter((resume) => resume.status === "ok"), [all]);
  const errors = useMemo(() => all.filter((resume) => resume.status === "error"), [all]);
  const isRoleTab = tab === "LCA" || tab === "UX";

  const rows = useMemo(() => {
    if (!isRoleTab) return [];
    const query = search.trim().toLowerCase();
    return successful
      .filter((resume) => {
        const role = resume.roles?.[tab];
        if (!role || role.score < minScore) return false;
        if (classFilter !== "all" && resume.classification !== classFilter) return false;
        return !query ||
          resume.name.toLowerCase().includes(query) ||
          resume.fileName.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sortBy === "years") return (b.years ?? -1) - (a.years ?? -1);
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return b.roles[tab].score - a.roles[tab].score;
      });
  }, [classFilter, isRoleTab, minScore, search, sortBy, successful, tab]);

  const selected = all.find((resume) => resume.id === selectedId);
  const lastUpload = uploads.find((resume) => resume.id === lastUploadId);

  function rankOf(roleId, id) {
    const ranked = [...successful].sort(
      (a, b) => b.roles[roleId].score - a.roles[roleId].score,
    );
    const index = ranked.findIndex((resume) => resume.id === id);
    return index < 0 ? null : { rank: index + 1, total: ranked.length };
  }

  function previewUrl(resume) {
    if (resume.source === "pile") {
      return `/api/resume/${encodeURIComponent(resume.fileName)}`;
    }
    return localUrls.current.get(resume.id) || null;
  }

  function exportCsv() {
    const header = [
      "rank", "name", "file", "headline", "score", "classification",
      "years_of_experience", "matched_jd_criteria", "missing_jd_criteria",
    ];
    const lines = rows.map((resume) => {
      const rank = rankOf(tab, resume.id)?.rank ?? "";
      return [
        rank,
        resume.name,
        resume.fileName,
        resume.headline,
        resume.roles[tab].score,
        CLASS_LABEL[resume.classification] || resume.classification,
        resume.years ?? "",
        resume.roles[tab].matched.map((skill) => skill.term).join("; "),
        resume.roles[tab].missing.join("; "),
      ].map(csvCell).join(",");
    });

    const blob = new Blob(["\uFEFF", [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tab.toLowerCase()}-resume-ranking.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportReviewLog() {
    const header = ["file", "source", "status", "error", "classification", "lca_score", "ux_score", "years", "years_estimated", "extracted_characters", "matched_jd_criteria", "education_section_found", "experience_section_found", "projects_section_found", "warnings"];
    const lines = all.map((resume) => [
      resume.fileName, resume.source, resume.status, resume.error || "",
      CLASS_LABEL[resume.classification] || resume.classification || "",
      resume.roles?.LCA?.score ?? "", resume.roles?.UX?.score ?? "",
      resume.years ?? "", resume.yearsEstimated ?? "", resume.textLength ?? "",
      resume.extracted?.criteria?.join("; ") || "",
      Boolean(resume.extracted?.education), Boolean(resume.extracted?.experience),
      Boolean(resume.extracted?.projects), resume.warnings?.map((warning) => warning.msg).join("; ") || "",
    ].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF", [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "resume-review-and-cleaning-log.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    handleFiles(event.dataTransfer.files);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Resume Ranker home">
          <span className="brand-mark">R</span>
          <span>Resume<span className="brand-light">Ranker</span></span>
        </a>
        <div className="topbar-meta">
          <span className={`status-dot ${loading ? "is-loading" : ""}`} />
          {loading ? "Loading resume library" : "Workspace ready"}
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">CANDIDATE REVIEW WORKSPACE</p>
          <h1>Find the right fit, faster.</h1>
          <p className="hero-copy">
            Compare resumes against the LCA and UI/UX role profiles. Review skill matches,
            experience, and supporting evidence in one place.
          </p>
          <p className="profile-notice">Rankings use the supplied detailed job descriptions. The LCA JD says 2–3 years; the assignment summary says 4–6, so experience-range flags require human review.</p>
        </div>
        <button className="button button-secondary refresh-button" onClick={loadPile} disabled={loading || busy}>
          <span aria-hidden="true">↻</span> Refresh library
        </button>
      </section>

      <section className="stats-grid" aria-label="Resume library summary">
        <article className="stat-card">
          <span className="stat-label">Library resumes</span>
          <strong className="stat-value">{pile.length}</strong>
          <span className="stat-note">Available for comparison</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Analyzed successfully</span>
          <strong className="stat-value">{successful.length}</strong>
          <span className="stat-note">Library and current uploads</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Current uploads</span>
          <strong className="stat-value">{uploads.length}</strong>
          <span className="stat-note">Available in this browser session</span>
        </article>
        <article className={`stat-card ${errors.length ? "stat-card-alert" : ""}`}>
          <span className="stat-label">Needs attention</span>
          <strong className="stat-value">{errors.length}</strong>
          <span className="stat-note">Files that could not be analyzed</span>
        </article>
      </section>

      <section className="panel upload-panel" aria-labelledby="upload-heading">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">ADD CANDIDATES</p>
            <h2 id="upload-heading">Analyze new resumes</h2>
          </div>
          <span className="session-badge">Session only</span>
        </div>
        <label
          className={`dropzone ${dragging ? "dropzone-active" : ""} ${busy ? "dropzone-disabled" : ""}`}
          htmlFor="resume-upload"
          onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            id="resume-upload"
            className="visually-hidden"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            disabled={busy}
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <span className="upload-icon" aria-hidden="true">↑</span>
          <span className="dropzone-title">{busy ? "Analyzing resumes…" : "Drop files here or browse"}</span>
          <span className="dropzone-copy">PDF, DOCX, TXT, or MD · Multiple files · 15 MB maximum per file</span>
          <span className="button button-primary browse-button">Choose files</span>
        </label>
        <div className="upload-footer">
          <span aria-hidden="true">ⓘ</span>
          Uploaded files are kept only in this page session and are not added to the resume library.
        </div>
        {busy && (
          <div className="progress-wrap" role="status" aria-live="polite">
            <span className="progress-spinner" aria-hidden="true" />
            <span>{progress}</span>
          </div>
        )}
        {lastUpload?.status === "ok" && (
          <div className="upload-result" role="status">
            <strong>Latest result: {lastUpload.name}</strong>
            <span>
              LCA rank {rankOf("LCA", lastUpload.id)?.rank ?? "—"} of {rankOf("LCA", lastUpload.id)?.total ?? 0}
              <span className="result-separator">·</span>
              UI/UX rank {rankOf("UX", lastUpload.id)?.rank ?? "—"} of {rankOf("UX", lastUpload.id)?.total ?? 0}
              <span className="result-separator">·</span>
              {CLASS_LABEL[lastUpload.classification] || lastUpload.classification}
            </span>
          </div>
        )}
      </section>

      <section className="role-grid" aria-label="Active role profiles">
        {Object.values(ROLES).map((role) => (
          <article className="role-card" key={role.id}>
            <div className="role-card-top">
              <span className={`role-icon role-icon-${role.id.toLowerCase()}`} aria-hidden="true">
                {role.id === "LCA" ? "LC" : "UX"}
              </span>
              <span className="role-type">{role.id === "LCA" ? "SUSTAINABILITY" : "PRODUCT DESIGN"}</span>
            </div>
            <h2>{role.title}</h2>
            <p className="role-description">{role.description}</p>
            <p className="role-experience">Experience: <strong>{role.experienceLabel}</strong></p>
            <p className="role-keywords">{role.skills.map((skill) => skill.term).join(" · ")}</p>
            <a className="text-link role-source" href={role.sourceUrl} target="_blank" rel="noreferrer">Open job description ↗</a>
            <span className="role-provisional">{role.sourceStatus}</span>
          </article>
        ))}
      </section>

      <section className="panel results-panel" aria-labelledby="results-heading">
        <div className="results-heading-row">
          <div>
            <p className="eyebrow">SHORTLIST</p>
            <h2 id="results-heading">Resume rankings</h2>
          </div>
          <div className="export-actions">
            <button className="button button-secondary export-button" onClick={exportReviewLog} disabled={!all.length}>
              <span aria-hidden="true">↓</span> Review log
            </button>
            <button className="button button-secondary export-button" onClick={exportCsv} disabled={!rows.length || !isRoleTab}>
              <span aria-hidden="true">↓</span> Export ranking
            </button>
          </div>
        </div>

        <div className="results-toolbar">
          <div className="tabs" role="tablist" aria-label="Ranking view">
            <button role="tab" aria-selected={tab === "LCA"} className={tab === "LCA" ? "active" : ""} onClick={() => setTab("LCA")}>
              LCA <span>{successful.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "UX"} className={tab === "UX" ? "active" : ""} onClick={() => setTab("UX")}>
              UI/UX <span>{successful.length}</span>
            </button>
            <button role="tab" aria-selected={tab === "Errors"} className={tab === "Errors" ? "active" : ""} onClick={() => setTab("Errors")}>
              Errors <span className={errors.length ? "count-alert" : ""}>{errors.length}</span>
            </button>
          </div>

          {isRoleTab && (
            <div className="filters">
              <label className="search-field">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <span className="visually-hidden">Search by candidate or filename</span>
                <input
                  type="search"
                  placeholder="Search candidates…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="filter-control">
                <span>Min score <strong>{minScore}</strong></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(event) => setMinScore(Number(event.target.value))}
                  aria-label="Minimum score"
                />
              </label>
              <label className="select-control">
                <span className="visually-hidden">Sort resumes</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="score">Sort: Score</option>
                  <option value="years">Sort: Experience</option>
                  <option value="name">Sort: Name</option>
                </select>
              </label>
              <label className="select-control">
                <span className="visually-hidden">Filter by classification</span>
                <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                  <option value="all">All matches</option>
                  {Object.entries(CLASS_LABEL).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        {isRoleTab && (
          <p className="ranking-method-note">Role score: JD criteria 50% · experience 20% · education 10% · repeated evidence 20%. Matches are literal text evidence; missing keywords do not prove a candidate lacks the skill.</p>
        )}

        {isRoleTab && (
          <div className="table-scroll">
            <table className="ranking-table">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Candidate</th>
                  <th scope="col">Score</th>
                  <th scope="col">Classification</th>
                  <th scope="col">Experience</th>
                  <th scope="col">JD evidence</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((resume, index) => (
                  <tr
                    key={resume.id}
                    className={`candidate-row ${resume.source === "upload" ? "candidate-row-new" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${resume.name}, score ${resume.roles[tab].score}`}
                    onClick={() => setSelectedId(resume.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(resume.id);
                      }
                    }}
                  >
                    <td><span className="rank-number">{rankOf(tab, resume.id)?.rank ?? index + 1}</span></td>
                    <td>
                      <div className="candidate-name">
                        <span className="avatar" aria-hidden="true">{resume.name.slice(0, 1).toUpperCase()}</span>
                        <span>
                          <strong>{resume.name}</strong>
                          <small>{resume.fileName}</small>
                        </span>
                        {resume.source === "upload" && <span className="new-badge">NEW</span>}
                      </div>
                      <div className="candidate-headline">{resume.headline}</div>
                    </td>
                    <td>
                      <div className="score-cell">
                        <strong>{resume.roles[tab].score}</strong><span>/100</span>
                        <span className="score-track"><span style={{ width: `${resume.roles[tab].score}%` }} /></span>
                      </div>
                    </td>
                    <td><span className={`classification classification-${resume.classification}`}>{CLASS_LABEL[resume.classification] || resume.classification}</span></td>
                    <td>{resume.years == null ? "Not stated" : `${resume.years} yr${resume.years === 1 ? "" : "s"}`}{resume.yearsEstimated && <small className="estimated-note">Estimated</small>}</td>
                    <td>
                      <div className="skill-list">
                        {resume.roles[tab].matched.slice(0, 3).map((skill) => (
                          <span className="skill-chip" key={skill.term}>{skill.term}</span>
                        ))}
                        {!resume.roles[tab].matched.length && <span className="table-muted">No JD criteria matched</span>}
                      </div>
                    </td>
                    <td>{resume.warnings.length ? <span className="warning-count">{resume.warnings.length} note{resume.warnings.length === 1 ? "" : "s"}</span> : <span className="table-muted">Clear</span>}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td className="empty-cell" colSpan={7}>
                      <span className="empty-icon" aria-hidden="true">⌕</span>
                      <strong>{loading ? "Loading resumes…" : "No resumes match these filters"}</strong>
                      <span>{loading ? "The resume library is being prepared." : "Try clearing the search or lowering the minimum score."}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "Errors" && (
          <div className="error-list">
            {errors.length === 0 ? (
              <div className="empty-state">
                <span className="success-icon" aria-hidden="true">✓</span>
                <strong>All files analyzed</strong>
                <span>No processing errors to review.</span>
              </div>
            ) : errors.map((resume) => (
              <article className="error-item" key={resume.id}>
                <span className="error-icon" aria-hidden="true">!</span>
                <div>
                  <strong>{resume.fileName}</strong>
                  <p>{resume.error}</p>
                  <small>Check that the file contains readable text and is not password-protected or image-only.</small>
                  {resume.source === "pile" ? <a className="text-link error-source" href={`/api/resume/${encodeURIComponent(resume.fileName)}`} target="_blank" rel="noreferrer">Open original file ↗</a> : localUrls.current.get(resume.id) ? <a className="text-link error-source" href={localUrls.current.get(resume.id)} target="_blank" rel="noreferrer">Open uploaded file ↗</a> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected?.status === "ok" && (
        <section className="panel detail-panel" aria-labelledby="detail-heading">
          <div className="detail-heading-row">
            <div>
              <p className="eyebrow">CANDIDATE DETAILS</p>
              <h2 id="detail-heading">{selected.name}</h2>
              <p className="detail-subtitle">{selected.headline} · {selected.fileName} · {selected.textLength.toLocaleString()} characters</p>
            </div>
            <button className="button button-secondary" onClick={() => setSelectedId(null)}>Close details</button>
          </div>
          <div className="detail-role-grid">
            {["LCA", "UX"].map((roleId) => (
              <article className="detail-role-card" key={roleId}>
                <div className="detail-score-heading">
                  <h3>{ROLES[roleId].title}</h3>
                  <strong>{selected.roles[roleId].score}<span>/100</span></strong>
                </div>
                <div className="breakdown-list">
                  {Object.entries(selected.roles[roleId].breakdown).map(([label, score]) => (
                    <div className="breakdown-row" key={label}>
                      <span>{label.charAt(0).toUpperCase() + label.slice(1)}</span>
                      <span className="breakdown-track"><span style={{ width: `${score}%` }} /></span>
                      <strong>{score}</strong>
                    </div>
                  ))}
                </div>
                <h4>JD criteria found in resume text</h4>
                <div className="skill-list detail-skills">
                  {selected.roles[roleId].matched.map((skill) => <span className="skill-chip" key={skill.term}>{skill.mandatory ? "Required · " : ""}{skill.term} · {skill.hits}</span>)}
                  {!selected.roles[roleId].matched.length && <span className="table-muted">No JD criteria keywords matched.</span>}
                </div>
                <h4>Required or key criteria not found</h4>
                <p className="detail-missing">{selected.roles[roleId].missing.join(", ") || "None identified"}</p>
              </article>
            ))}
          </div>
          {selected.warnings.map((warning, index) => <p className="detail-warning" key={`${warning.msg}-${index}`}>ⓘ {warning.msg}</p>)}
          <div className="extracted-grid">
            <article className="extracted-card"><h3>Matched JD criteria</h3><div className="skill-list">{selected.extracted?.criteria?.map((criterion) => <span className="skill-chip" key={criterion}>{criterion}</span>)}{!selected.extracted?.criteria?.length && <span className="table-muted">No configured JD criteria found.</span>}</div></article>
            <article className="extracted-card"><h3>Education</h3><p>{selected.extracted?.education || "No recognizable education section found."}</p></article>
            <article className="extracted-card"><h3>Relevant experience</h3><p>{selected.extracted?.experience || "No recognizable experience section found."}</p></article>
            <article className="extracted-card"><h3>Projects</h3><p>{selected.extracted?.projects || "No recognizable projects section found."}</p></article>
          </div>
          <div className="evidence-grid">
            {["LCA", "UX"].map((roleId) => <article className="evidence-card" key={roleId}><h3>{ROLES[roleId].title}: matching evidence</h3>{selected.evidence?.[roleId]?.length ? <ul>{selected.evidence[roleId].map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul> : <p>No matching text evidence found.</p>}</article>)}
          </div>
          <div className="detail-footer">
            {previewUrl(selected) ? (
              <a className="text-link" href={previewUrl(selected)} target="_blank" rel="noreferrer">Open original resume ↗</a>
            ) : <span className="table-muted">The original upload is available only in this page session.</span>}
            <details>
              <summary>View extracted text</summary>
              <pre className="extracted-text">{selected.textPreview}</pre>
            </details>
          </div>
        </section>
      )}

      <footer className="app-footer">
        <span>Resume Ranker</span>
        <span>Scores support human review; they are not hiring decisions.</span>
      </footer>
    </main>
  );
}
