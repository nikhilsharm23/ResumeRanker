# Resume Ranker

A local candidate review prototype for the Growth For Impact software engineering assignment. It extracts text from the supplied resume pile, scores each resume against LCA and UI/UX role profiles, shows independent rankings, and lets a reviewer inspect evidence and the original file.

## Run locally

1. Install Node.js 20 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.
4. Select a row to review details. Use the role tabs, filters, and CSV export for separate shortlists. Upload PDF, DOCX, TXT or MD files up to 15 MB; uploads are compared with the pile for the current page session only.

For a production build, run `npm run build`, then `npm start`.

## Included in this workspace

- `data/resumes/`: all 47 supplied resume files. The blank DOCX is intentionally included so the app reports its extraction failure in the Errors tab.
- `lib/extract.js`: PDF, DOCX, TXT, and MD text extraction.
- `lib/scoring.js`: experience estimation, weighted scoring, classification, evidence snippets, and section extraction.
- `lib/jds.js`: two role profiles, source links, assignment-verified role facts, and clearly labeled skill assumptions.
- `data/job-descriptions/`: cleaned role descriptions transcribed from the detailed JDs supplied by the project owner.
- `METHODOLOGY.md`: scoring formula, cleaning notes, limitations, and reviewer checklist.

## Before final assignment submission

The detailed JD text supplied for this project is cleaned into `data/job-descriptions/` and its criteria are configured in `lib/jds.js`. Note the LCA experience conflict: the detailed JD says 2–3 years, while the assignment summary says 4–6 years. The app uses 2–3 for scoring and flags the conflict for review. Inspect the blank-file error and compare extracted data with source resumes. No hosting or deployment has been done.
