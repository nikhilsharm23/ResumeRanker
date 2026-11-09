import { ROLES } from "./jds";

const CURRENT_YEAR = new Date().getFullYear();

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Match whole words so terms such as "ui" do not match inside "guide".
function findTermMatches(lower, term) {
  const pattern = escapeRegex(term).replace(/ /g, "\\s+");
  const re = new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "g");
  return [...lower.matchAll(re)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
}

// Avoid counting an alias and its longer phrase twice at the same location.
function countTerms(lower, terms) {
  const matches = terms
    .flatMap((term) => findTermMatches(lower, term))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted = [];

  for (const match of matches) {
    if (!accepted.some((existing) => match.start < existing.end && match.end > existing.start)) {
      accepted.push(match);
    }
  }
  return accepted.length;
}

function normalize(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSection(text, headings, maxLength = 1800) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const headingPattern = new RegExp(`^(?:${headings.join("|")})\\s*[:\\-–]?\\s*$`, "i");
  const stopPattern = /^(?:education|academic|experience|employment|work history|projects?|skills|technical skills|certifications?|achievements?|summary|profile|contact|languages?)\s*[:\-–]?$/i;
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return "";
  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (stopPattern.test(line)) break;
    collected.push(line);
    if (collected.join(" ").length >= maxLength) break;
  }
  return collected.join("\n").slice(0, maxLength).trim();
}

function extractEvidence(text, terms, limit = 3) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const patterns = terms.map((term) => new RegExp(`(?<![a-z0-9])${escapeRegex(term).replace(/ /g, "\\s+")}(?![a-z0-9])`, "i"));
  return lines.filter((line) => patterns.some((pattern) => pattern.test(line))).slice(0, limit).map((line) => line.slice(0, 240));
}

// Convert a filename such as "anonymized_AA_1793682784144.docx" to "AA".
export function prettyName(fileName) {
  return (
    fileName
      .replace(/\.[^.]+$/, "")
      .replace(/^anonymized_/, "")
      .replace(/_\d{10,}$/, "") || fileName
  );
}

// Prefer an explicit experience statement; otherwise estimate from date ranges.
export function extractYears(text) {
  const explicit = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/gi)]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => n >= 0 && n <= 40);

  if (explicit.length)
    return { years: Math.max(...explicit), estimated: false };

  const ranges = [
    ...text.matchAll(
      /(19\d{2}|20\d{2})\s*(?:-|–|to)\s*(19\d{2}|20\d{2}|present|current)/gi,
    ),
  ];
  const periods = ranges
    .map((match) => ({
      start: Number.parseInt(match[1], 10),
      end: /\d/.test(match[2]) ? Number.parseInt(match[2], 10) : CURRENT_YEAR,
    }))
    .filter((period) => period.end >= period.start)
    .sort((a, b) => a.start - b.start);

  if (!periods.length) return { years: null, estimated: false };

  let total = 0;
  let current = { ...periods[0] };
  for (const period of periods.slice(1)) {
    if (period.start <= current.end) {
      current.end = Math.max(current.end, period.end);
    } else {
      total += current.end - current.start;
      current = { ...period };
    }
  }
  total += current.end - current.start;
  return { years: Math.min(total, 40), estimated: true };
}

// Score a resume against one role profile.
export function scoreForRole(text, roleId, years) {
  const role = ROLES[roleId];
  const lower = text.toLowerCase();

  let totalW = 0;
  let gotW = 0;
  let depthHits = 0;
  const matched = [];
  const missing = [];

  for (const s of role.skills) {
    totalW += s.weight;
    const hits = countTerms(lower, [s.term, ...(s.aliases || [])]);
    if (hits > 0) {
      gotW += s.weight;
      depthHits += hits;
      matched.push({ term: s.term, hits, weight: s.weight, mandatory: Boolean(s.mandatory) });
    } else if (s.mandatory || s.weight >= 2) {
      missing.push(s.term);
    }
  }
  matched.sort((a, b) => b.weight - a.weight);

  // The weighted requirements component is the share of configured JD evidence.
  const skillScore = totalW ? (gotW / totalW) * 100 : 100;

  let expScore;
  if (years == null) expScore = 50; // Missing experience text is unknown, not proof of zero experience.
  else if (role.id === "LCA") expScore = Math.min(100, (years / role.minYears) * 100);
  else expScore = 100; // The UI/UX JD is open to 0–1 year; more is reviewed, not penalized.

  const educationText = extractSection(text, ["education", "academic background", "qualifications", "education and training"]) || text;
  const eduHits = role.education.filter((term) => countTerms(educationText.toLowerCase(), [term]) > 0).length;
  const eduScore = role.education.length ? Math.min(100, eduHits * (100 / Math.min(2, role.education.length))) : 100;

  // Evidence depth reflects how often relevant terms appear in the resume.
  const depthScore = Math.min(100, depthHits * 5);

  const score = Math.round(
    0.5 * skillScore + 0.2 * expScore + 0.1 * eduScore + 0.2 * depthScore,
  );

  const r = (n) => Math.round(n);
  return {
    score,
    breakdown: {
      requirements: r(skillScore),
      experience: r(expScore),
      education: r(eduScore),
      depth: r(depthScore),
    },
    matched,
    missing,
  };
}

// Classify both >= 50 with a gap under 10; one role >= 50; uncertain when the
// top score is 30-49; otherwise, neither.
export function classify(lcaScore, uxScore) {
  const hi = Math.max(lcaScore, uxScore);
  const lo = Math.min(lcaScore, uxScore);
  if (lo >= 50 && hi - lo < 10) return "both";
  if (hi >= 50) return lcaScore > uxScore ? "lca" : "ux";
  if (hi >= 30) return "uncertain";
  return "neither";
}

export function analyzeText(rawText, fileName) {
  const text = normalize(rawText || "");
  if (text.length < 30) {
    throw new Error(
      "No resume text could be extracted. The file may be blank, scanned, image-only, or password-protected. OCR is not available; use a non-empty, text-readable copy.",
    );
  }

  const warnings = [];
  if (text.length < 300) {
    warnings.push({
      level: "warn",
      msg: "Very little text was extracted; this resume may be incomplete.",
    });
  }

  const yearInfo = extractYears(text);
  if (yearInfo.years == null) {
    warnings.push({
      level: "info",
      msg: "Years of experience were not clearly stated.",
    });
  } else if (yearInfo.estimated) {
    warnings.push({
      level: "info",
      msg: `Approximately ${yearInfo.years} years of experience, estimated from date ranges.`,
    });
  }
  if (yearInfo.years != null && ROLES.LCA.minYears != null && ROLES.LCA.maxYears != null && (yearInfo.years < ROLES.LCA.minYears || yearInfo.years > ROLES.LCA.maxYears)) {
    warnings.push({
      level: "info",
      msg: `The detailed LCA JD states ${ROLES.LCA.minYears}–${ROLES.LCA.maxYears} years; this resume indicates ${yearInfo.years}. The assignment summary says 4–6 years, so confirm which range the reviewer intends.`,
    });
  }
  if (ROLES.UX.maxYears != null && yearInfo.years > ROLES.UX.maxYears) {
    warnings.push({
      level: "info",
      msg: `The UI/UX JD is open to 0–1 year of experience; this resume indicates ${yearInfo.years}. Review portfolio and role fit rather than treating experience as an automatic disqualifier.`,
    });
  }

  const lca = scoreForRole(text, "LCA", yearInfo.years);
  const ux = scoreForRole(text, "UX", yearInfo.years);

  // If the first line looks like initials, use the next line as the headline.
  const lines = text.split("\n").filter(Boolean);
  const headline =
    lines.length > 1 && lines[0].length <= 6 ? lines[1] : lines[0];

  const criteria = [...new Set([...lca.matched, ...ux.matched].map(({ term }) => term))];
  const education = extractSection(text, ["education", "academic background", "qualifications", "education and training"], 1200);
  const experience = extractSection(text, ["experience", "work experience", "professional experience", "employment history", "work history"], 1800);
  const projects = extractSection(text, ["projects", "selected projects", "academic projects", "design projects", "project experience"], 1600);

  return {
    headline: headline.slice(0, 120),
    textLength: text.length,
    years: yearInfo.years,
    yearsEstimated: yearInfo.estimated,
    roles: { LCA: lca, UX: ux },
    classification: classify(lca.score, ux.score),
    extracted: { criteria, education, experience, projects },
    evidence: {
      LCA: extractEvidence(text, lca.matched.flatMap(({ term }) => [term, ...(ROLES.LCA.skills.find((skill) => skill.term === term)?.aliases || [])])),
      UX: extractEvidence(text, ux.matched.flatMap(({ term }) => [term, ...(ROLES.UX.skills.find((skill) => skill.term === term)?.aliases || [])])),
    },
    warnings,
    textPreview: text.slice(0, 3000),
  };
}
