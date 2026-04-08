const ROOT = process.cwd();

const PATHS = {
  dataFile: `${ROOT}/data/projects.json`,
  schemaFile: `${ROOT}/data/projects.schema.json`,
  enHtml: `${ROOT}/public/index.html`,
  frHtml: `${ROOT}/public/fr/index.html`,
};

const MARKERS = {
  projectsStart: "<!-- PROJECTS:START -->",
  projectsEnd: "<!-- PROJECTS:END -->",
};

module.exports = { PATHS, MARKERS };

