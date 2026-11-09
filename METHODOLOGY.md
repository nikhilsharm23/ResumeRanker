# Resume Ranker: Methodology and Data Notes

## Purpose and human review

The prototype extracts readable text from the supplied resumes, compares evidence against the two supplied job descriptions, ranks the library independently for each role, and supports human review. Scores are a screening aid, not a hiring decision. Missing keywords are not proof that a candidate lacks a skill.

## Source JDs and discrepancy

- JD1 (LCA Consultant): detailed description text was provided by the project owner and cleaned into `data/job-descriptions/lca-role.md`.
- JD2 (UI/UX Design Internship): detailed description text was provided by the project owner and cleaned into `data/job-descriptions/ui-ux-internship.md`.
- **LCA experience conflict:** the assignment summary says 4–6 years, while the detailed JD says 2–3 years independently running LCA projects. The scoring uses the detailed JD's 2–3 year range; candidates outside it receive a review warning. Confirm with the assignment owner which range governs before submitting.
- The structured criteria and aliases used by the scoring code are in `lib/jds.js` and are reflected in the candidate detail evidence.

## Supplied dataset and cleaning log

- All 47 anonymized resume files are kept in `data/resumes` and processed in filename order.
- `anonymized_resume_1793685080327.docx` was inspected inside the DOCX archive: the document body, headers, footers and comments contain no text, and there are no embedded images. It remains in the pile as an actionable source-file error. Re-saving cannot recover missing content; replace it from the original source if possible.
- Anonymized file references are retained; filenames are not treated as verified identities.
- PDF text uses `pdf-parse`; DOCX uses Mammoth; TXT and MD are decoded as UTF-8. Image-only/scanned documents have no OCR and appear in Errors.
- Uploaded PDF, DOCX, TXT and MD files up to 15 MB are ranked alongside the pile for the current browser session and are not saved to disk; unsupported, empty, or oversized files produce actionable error rows.
- The Review Log CSV records per-file status, errors, scores, extracted sections, skills, warnings and source filename for cleanup/review.

## Ranking method

Each role receives an independent 0–100 score:

| Component | Weight | Calculation |
|---|---:|---|
| JD criteria | 50% | Sum of matched criterion weights divided by the total configured weight. Core/mandatory criteria carry greater weights. |
| Experience | 20% | LCA: parsed years divided by the detailed JD minimum (2), capped at 100. UI/UX: 100 when a numeric experience value is found (0–1 is the JD target). Missing years receive a neutral 50 and a warning; unknown is not treated as zero experience. Out-of-range values are flagged for human review. |
| Education | 10% | LCA: matches degree/domain terms from the JD in the education section (or resume text if no section is found). UI/UX has no degree requirement, so this component is neutral (100). |
| Evidence depth | 20% | Repeated mentions of matched role criteria, capped at 100. |

Classification thresholds: both scores >=50 and within 9 points = strong match for both; otherwise a score >=50 identifies the stronger role; top score 30–49 = needs review; both below 30 = low match. These prototype thresholds are not calibrated hiring cutoffs.

## Extraction and experience handling

- Explicit “X years” statements take precedence; otherwise, the parser estimates time from year ranges and merges overlapping ranges. This can include unrelated dates; estimates are marked approximate.
- Candidate details show matched JD criteria, supporting text evidence, criteria not found, score components, recognizable education/experience/project sections, warnings and the original resume link.
- Section extraction relies on recognizable headings. Missing/unreadable files are retained as error rows and do not stop processing other files.

## Limitations and reviewer checklist

- Matching uses literal terms and aliases, not semantic understanding. Review the original resume for relevant equivalents and verify every missing mandatory criterion manually.
- OCR is not included; provide a text-based copy for scanned resumes.
- LCA experience range conflict (2–3 in detailed JD versus 4–6 in assignment summary) needs confirmation.
- Inspect the blank DOCX error, compare extracted text with source documents, correct inaccurate data, and review the exported cleanup log before submitting.
