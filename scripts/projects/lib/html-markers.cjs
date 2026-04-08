function hasMarkers(html, { start, end }) {
  return html.includes(start) && html.includes(end);
}

function replaceBetweenMarkers(html, { start, end }, replacement) {
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error("Markers not found (or invalid order).");
  }
  const before = html.slice(0, startIdx + start.length);
  const after = html.slice(endIdx);
  return `${before}\n${replacement}\n${after}`;
}

module.exports = { hasMarkers, replaceBetweenMarkers };

