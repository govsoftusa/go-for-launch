function right(box) {
  return box.left + box.width;
}

function bottom(box) {
  return box.top + box.height;
}

export function rectanglesOverlap(first, second, tolerance = 1) {
  const overlapX = Math.min(right(first), right(second)) - Math.max(first.left, second.left);
  const overlapY = Math.min(bottom(first), bottom(second)) - Math.max(first.top, second.top);
  return overlapX > tolerance && overlapY > tolerance;
}

export function fragmentSetsOverlap(first = [], second = [], tolerance = 1) {
  return first.some((firstFragment) => second.some((secondFragment) => rectanglesOverlap(firstFragment, secondFragment, tolerance)));
}

export function fingerprintDifferences(first, second) {
  const dimensions = ["structure", "layout", "palette", "typography", "media"];
  return dimensions.filter((dimension) => JSON.stringify(first?.[dimension]) !== JSON.stringify(second?.[dimension]));
}

export function cleanArtifactName(value) {
  return String(value || "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "home";
}
