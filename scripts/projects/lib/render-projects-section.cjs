function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDesignerMention({ locale, designer }) {
  if (!designer?.name || !designer?.url) return "";
  const prefix = locale === "fr" ? "Design par" : "Design made by";
  return `
                                  <div class="project_mentions w-richtext">
                                    <p>
                                      ${prefix}
                                      <a href="${escapeHtml(designer.url)}" target="_blank">${escapeHtml(designer.name)}</a>
                                    </p>
                                  </div>`;
}

function renderStatusLabel({ locale, statusLabel, year }) {
  const released = locale === "fr" ? "Sortie en" : "Released in";
  const workingSince = locale === "fr" ? "En cours depuis" : "Working on since";

  const releasedInvisible = statusLabel === "working_since";
  const workingInvisible = statusLabel === "released";

  return `
                                  <div class="tag_project release-date">
                                    <div${releasedInvisible ? ' class="w-condition-invisible"' : ""}>
                                      ${released}
                                    </div>
                                    <div${workingInvisible ? ' class="w-condition-invisible"' : ""}>
                                      ${workingSince}
                                    </div>
                                    <div>${escapeHtml(year)}</div>
                                  </div>`;
}

function renderSlide({ locale, project, index, total }) {
  const viewWebsite = locale === "fr" ? "Voir le site" : "View website";

  const mobileAlt =
    locale === "fr" ? "Capture d’écran du site" : "Website screenshot";

  const mobile = project.images.mobile;
  const desktopFull = project.images.desktopFull;
  const desktopHeight = Number.isFinite(desktopFull?.height)
    ? Number(desktopFull.height)
    : NaN;

  const animSpeedClass =
    Number.isFinite(desktopHeight) && desktopHeight < 2500
      ? " anim-speed-3"
      : Number.isFinite(desktopHeight) && desktopHeight < 4500
        ? " anim-speed-2"
        : "";

  const mentions = project.designer
    ? renderDesignerMention({ locale, designer: project.designer })
    : `
                                  <div class="project_mentions w-dyn-bind-empty w-richtext"></div>`;

  const srcset = (mobile.srcset || "").trim();
  const srcsetAttr = srcset
    ? `srcset="
${srcset
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => `                                    ${l}`)
  .join("\n")}
                                  "`
    : "";

  return `
                        <div role="group" class="swiper-slide w-dyn-item" aria-label="${index + 1} / ${total}">
                          <div class="slide_project swiper-js">
                            <div data-w-id="e71a52e2-9918-d284-d3a8-165eb04de3b5" class="_w-project${animSpeedClass}">
                              <a href="${escapeHtml(project.url)}" target="_blank" class="link__project w-inline-block"></a>
                              <div>
                                <img
                                  loading="lazy"
                                  src="${escapeHtml(mobile.src)}"
                                  alt="${escapeHtml(mobile.alt || mobileAlt)}"
                                  sizes="${escapeHtml(mobile.sizes)}"
                                  ${srcsetAttr}
                                  class="image-mobile_project"
                                />
                                <div
                                  style="
                                    background-image: url(&quot;${escapeHtml(desktopFull.backgroundImageUrl)}&quot;);
                                  "
                                  class="image-bg_project"
                                ></div>
                                <div class="_w-content_project">
${renderStatusLabel({ locale, statusLabel: project.statusLabel, year: project.year })}
                                  <h3>${escapeHtml(project.titleLine)}</h3>
${mentions}
                                </div>
                              </div>
                              <div class="project-link">
                                <div>${viewWebsite}</div>
                                <div style="width: 0%; height: 1px" class="underline_project"></div>
                              </div>
                            </div>
                          </div>
                        </div>`;
}

function renderProjectsSlides({ locale, projects }) {
  return projects
    .map((project, index) =>
      renderSlide({ locale, project, index, total: projects.length }),
    )
    .join("\n");
}

module.exports = { renderProjectsSlides };
