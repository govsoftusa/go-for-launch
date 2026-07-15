function right(box) {
  return box.left + box.width;
}

function bottom(box) {
  return box.top + box.height;
}

export function intersectionArea(left, rightBox) {
  const width = Math.max(0, Math.min(right(left), right(rightBox)) - Math.max(left.left, rightBox.left));
  const height = Math.max(0, Math.min(bottom(left), bottom(rightBox)) - Math.max(left.top, rightBox.top));
  return width * height;
}

function bounds(boxes) {
  return {
    left: Math.min(...boxes.map((box) => box.left)),
    top: Math.min(...boxes.map((box) => box.top)),
    width: Math.max(...boxes.map(right)) - Math.min(...boxes.map((box) => box.left)),
    height: Math.max(...boxes.map(bottom)) - Math.min(...boxes.map((box) => box.top))
  };
}

function validBox(box) {
  return box && [box.left, box.top, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0;
}

export function analyzeVisualComposition({
  artboard,
  labels = [],
  decorations = [],
  minimumHorizontalFill = 0.5,
  minimumVerticalFill = 0.5,
  minimumEdgeInset = 0,
  maximumOverlapArea = 1
}) {
  const findings = [];

  if (!validBox(artboard)) {
    return { passed: false, findings: ["Artboard has invalid geometry."], metrics: null };
  }

  if (labels.length === 0) {
    return { passed: false, findings: ["Artboard has no marked visual labels."], metrics: null };
  }

  for (const label of labels) {
    if (!validBox(label)) {
      findings.push(`${label.name || "Unnamed label"} has invalid geometry.`);
      continue;
    }
    if (
      label.left < artboard.left + minimumEdgeInset ||
      label.top < artboard.top + minimumEdgeInset ||
      right(label) > right(artboard) - minimumEdgeInset ||
      bottom(label) > bottom(artboard) - minimumEdgeInset
    ) {
      findings.push(`${label.name} escapes the artboard safe area.`);
    }
  }

  for (let index = 0; index < labels.length; index += 1) {
    for (let other = index + 1; other < labels.length; other += 1) {
      const overlap = intersectionArea(labels[index], labels[other]);
      if (overlap > maximumOverlapArea) {
        findings.push(`${labels[index].name} overlaps ${labels[other].name} by ${Math.round(overlap)} square pixels.`);
      }
    }
  }

  for (const decoration of decorations) {
    if (!validBox(decoration)) {
      findings.push(`${decoration.name || "Unnamed decoration"} has invalid geometry.`);
      continue;
    }
    for (const label of labels) {
      const overlap = intersectionArea(decoration, label);
      if (overlap > maximumOverlapArea) {
        findings.push(`${decoration.name} crosses ${label.name} by ${Math.round(overlap)} square pixels.`);
      }
    }
  }

  const labelBounds = bounds(labels.filter(validBox));
  const horizontalFill = labelBounds.width / artboard.width;
  const verticalFill = labelBounds.height / artboard.height;
  if (horizontalFill < minimumHorizontalFill) {
    findings.push(`Marked content fills ${(horizontalFill * 100).toFixed(1)}% of the artboard width, minimum is ${(minimumHorizontalFill * 100).toFixed(1)}%.`);
  }
  if (verticalFill < minimumVerticalFill) {
    findings.push(`Marked content fills ${(verticalFill * 100).toFixed(1)}% of the artboard height, minimum is ${(minimumVerticalFill * 100).toFixed(1)}%.`);
  }

  return {
    passed: findings.length === 0,
    findings,
    metrics: { horizontalFill, verticalFill, labelBounds, labelCount: labels.length, decorationCount: decorations.length }
  };
}
