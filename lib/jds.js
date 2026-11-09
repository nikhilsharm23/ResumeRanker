// Criteria below are transcribed from the detailed job descriptions pasted by
// the user. The assignment summary conflicts with the LCA JD's experience band;
// the detailed JD (2–3 years) is used for scoring and the conflict is disclosed.

export const ROLES = {
  LCA: {
    id: "LCA",
    title: "LCA Consultant · Chennai (onsite)",
    description: "Build LCI datasets, run LCA studies, validate data, model impacts, and benchmark findings.",
    sourceUrl: "https://tally.so/r/9q5plp",
    sourceStatus: "Based on detailed JD · experience range conflicts with assignment summary",
    minYears: 2,
    maxYears: 3,
    experienceLabel: "2–3 years in detailed JD (summary says 4–6)",
    education: ["bachelor", "bachelors", "bachelor's", "master", "masters", "master's", "environmental", "environmental science", "environmental engineering"],
    skills: [
      { term: "Independent LCA project delivery", aliases: ["life cycle assessment", "lifecycle assessment", "life-cycle assessment", "lca project", "lca studies", "lca study"], weight: 3, mandatory: true },
      { term: "Life Cycle Inventory (LCI) data collection", aliases: ["life cycle inventory", "lifecycle inventory", "lci", "inventory data", "collect and compile data"], weight: 3, mandatory: true },
      { term: "LCA modelling", aliases: ["lca modeling", "lca modelling", "life cycle model", "lifecycle model", "life cycle assessment model"], weight: 3, mandatory: true },
      { term: "GaBi or SimaPro", aliases: ["gabi", "sima pro", "simapro"], weight: 3, mandatory: true },
      { term: "ISO 14040", aliases: ["iso14040"], weight: 3, mandatory: true },
      { term: "ISO 14044", aliases: ["iso14044"], weight: 3, mandatory: true },
      { term: "At least 3 completed LCA projects", aliases: ["3 lca projects", "03 lca projects", "three lca projects", "three life cycle assessment projects", "completed three lca", "completed 3 lca"], weight: 3, mandatory: true },
      { term: "LCI data validation and quality control", aliases: ["data validation", "quality control", "data quality", "validate and standardize", "accuracy completeness consistency"], weight: 2, mandatory: true },
      { term: "Documented assumptions and traceable models", aliases: ["assumptions", "traceable", "audit ready", "audit-ready", "documented assumptions"], weight: 2, mandatory: true },
      { term: "Operational and plant-level data", aliases: ["operational data", "plant level", "plant-level", "assembly details", "cross-functional teams", "cfts"], weight: 2 },
      { term: "Energy, resources, and logistics data", aliases: ["energy use", "resource use", "inbound transportation", "outbound transportation", "supplier logistics", "transportation distances"], weight: 2 },
      { term: "Public benchmarking and research", aliases: ["benchmarking", "benchmark data", "research papers", "academic studies", "regulatory filings", "industry reports", "public sources"], weight: 2 },
      { term: "Environmental Product Declaration (EPD)", aliases: ["epd", "environmental product declaration"], weight: 1 },
      { term: "English communication", aliases: ["fluent english", "spoken and written english", "written english", "spoken english"], weight: 1 },
      { term: "Stakeholder and customer management", aliases: ["stakeholder management", "customer relationships", "client relationships", "cross functional"], weight: 1 },
      { term: "Business finance or accounting", aliases: ["business finance", "financial accounting", "accounting"], weight: 0.5 },
      { term: "Willingness to travel", aliases: ["travel extensively", "willingness to travel", "travel across india"], weight: 1 },
      { term: "Chennai relocation and onsite availability", aliases: ["relocate to chennai", "chennai", "onsite", "on-site", "full-time from the office", "office attendance"], weight: 1 },
      { term: "One-year commitment", aliases: ["minimum commitment of 1 year", "minimum commitment of one year", "one year commitment", "01 year"], weight: 1 },
    ],
  },

  UX: {
    id: "UX",
    title: "UX/UI Designer Intern · Remote",
    description: "Design user-centred interfaces for the website and job board, from research through prototypes and design specs.",
    sourceUrl: "https://tally.so/r/0QovpQ",
    sourceStatus: "Based on detailed JD",
    minYears: 0,
    maxYears: 1,
    experienceLabel: "0–1 year in detailed JD",
    // The JD does not require a degree; education is neutral unless a role-specific
    // education requirement is added from a future verified JD revision.
    education: [],
    skills: [
      { term: "UI/UX design principles", aliases: ["ui/ux", "ux/ui", "ux design", "ui design", "user experience", "user interface"], weight: 3, mandatory: true },
      { term: "User research", aliases: ["user research", "user interviews", "user testing", "user feedback"], weight: 2 },
      { term: "User psychology and behaviour", aliases: ["user psychology", "user behavior", "user behaviour", "user needs", "human-centered", "human centred", "human centered design"], weight: 3, mandatory: true },
      { term: "Figma", aliases: ["figma"], weight: 3, mandatory: true },
      { term: "Prototyping tools and high-fidelity prototypes", aliases: ["prototyping", "prototype", "high fidelity", "high-fidelity", "design specifications", "design specs"], weight: 2 },
      { term: "Website and job-board interface design", aliases: ["job board", "website design", "responsive design", "multiple devices", "various devices", "digital products"], weight: 2 },
      { term: "Visual aesthetics and attention to detail", aliases: ["aesthetic", "visual design", "attention to detail", "eye for detail", "design quality"], weight: 2, mandatory: true },
      { term: "Creativity and experimentation", aliases: ["creative", "creativity", "experimentation", "experiment"], weight: 2, mandatory: true },
      { term: "Cross-functional collaboration", aliases: ["cross-functional", "cross functional", "business objectives", "collaborate with teams"], weight: 1 },
      { term: "Design critiques and feedback", aliases: ["design critique", "feedback sessions", "design feedback"], weight: 1 },
      { term: "Consistent design language", aliases: ["design language", "visual identity", "design consistency"], weight: 1 },
      { term: "Industry trends and best practices", aliases: ["industry trends", "best practices", "ux trends"], weight: 0.5 },
      { term: "Portfolio or design project evidence", aliases: ["portfolio", "design projects", "case study", "case studies"], weight: 1 },
    ],
  },
};
