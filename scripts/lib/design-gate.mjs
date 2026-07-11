const modes = new Set(["off", "advisory", "required"]);
const frameworks = new Set(["none", "material", "apple-liquid-glass", "custom", "hybrid"]);
const scopes = new Set(["changed-ui", "full-site"]);
const reviewStatuses = new Set(["pass", "fail", "not-applicable"]);

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value) {
  return Array.isArray(value) && value.every(text);
}

export function validateDesignGateConfig(config) {
  const errors = [];

  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return ["The design gate configuration must export an object."];
  }

  if (!modes.has(config.mode)) errors.push(`mode must be one of: ${[...modes].join(", ")}.`);
  if (!frameworks.has(config.framework)) errors.push(`framework must be one of: ${[...frameworks].join(", ")}.`);
  if (!scopes.has(config.scope)) errors.push(`scope must be one of: ${[...scopes].join(", ")}.`);
  if (typeof config.reviewerRequired !== "boolean") errors.push("reviewerRequired must be true or false.");

  if (config.mode === "off" && config.framework !== "none") {
    errors.push("framework must be none when the design gate is off.");
  }
  if ((config.mode === "advisory" || config.mode === "required") && config.framework === "none") {
    errors.push("Select a design framework when the design gate is advisory or required.");
  }
  if ((config.framework === "custom" || config.framework === "hybrid") && !text(config.customGuide)) {
    errors.push("customGuide is required for custom or hybrid design review.");
  }
  if (config.customGuide !== null && config.customGuide !== undefined && !text(config.customGuide)) {
    errors.push("customGuide must be a non-empty string or null.");
  }

  return errors;
}

export function validateDesignReview(review, config) {
  const errors = [];

  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return ["The design review record must be an object."];
  }

  if (!reviewStatuses.has(review.status)) errors.push(`status must be one of: ${[...reviewStatuses].join(", ")}.`);
  if (!stringList(review.evidence)) errors.push("evidence must be an array of non-empty strings.");
  if (review.findings !== undefined && !stringList(review.findings)) errors.push("findings must be an array of non-empty strings when provided.");

  if (review.status === "not-applicable") {
    if (!text(review.reason)) errors.push("A not-applicable review requires a reason.");
    if (!Array.isArray(review.evidence) || review.evidence.length === 0) errors.push("A not-applicable review requires applicability evidence.");
  }

  if (review.status === "pass" || review.status === "fail") {
    if (!text(review.candidate)) errors.push("A completed design review requires a candidate identifier.");
    if (!Array.isArray(review.evidence) || review.evidence.length === 0) errors.push("A completed design review requires evidence.");
  }

  if (review.status === "fail" && (!Array.isArray(review.findings) || review.findings.length === 0)) {
    errors.push("A failed design review requires at least one finding.");
  }

  if (config.reviewerRequired && review.status === "pass") {
    if (!text(review.reviewer)) errors.push("A passing review requires a reviewer under this project policy.");
    if (!text(review.reviewedAt)) errors.push("A passing review requires a review date under this project policy.");
  }

  return errors;
}

export function evaluateDesignGate(config, review) {
  const configErrors = validateDesignGateConfig(config);
  const base = {
    gate: "design-system-conformance",
    mode: config?.mode ?? null,
    framework: config?.framework ?? null,
    scope: config?.scope ?? null
  };

  if (configErrors.length > 0) {
    return { ...base, status: "failed", blocking: true, reason: "Invalid design gate configuration.", findings: configErrors };
  }

  if (config.mode === "off") {
    return { ...base, status: "skipped", blocking: false, reason: "Disabled by project policy.", findings: [] };
  }

  if (!review) {
    const blocking = config.mode === "required";
    return {
      ...base,
      status: blocking ? "failed" : "advisory-findings",
      blocking,
      reason: "No design review record was provided.",
      findings: ["Create a design review record before claiming design-system conformance."]
    };
  }

  const reviewErrors = validateDesignReview(review, config);
  if (reviewErrors.length > 0) {
    const blocking = config.mode === "required";
    return {
      ...base,
      status: blocking ? "failed" : "advisory-findings",
      blocking,
      reason: "The design review record is invalid.",
      findings: reviewErrors
    };
  }

  if (review.status === "not-applicable") {
    return {
      ...base,
      status: "not-applicable",
      blocking: false,
      reason: review.reason,
      evidence: review.evidence,
      findings: []
    };
  }

  if (review.status === "fail") {
    const blocking = config.mode === "required";
    return {
      ...base,
      status: blocking ? "failed" : "advisory-findings",
      blocking,
      reason: blocking ? "Required design review failed." : "Advisory design review reported findings.",
      candidate: review.candidate,
      evidence: review.evidence,
      findings: review.findings
    };
  }

  return {
    ...base,
    status: "passed",
    blocking: false,
    reason: "Design review passed under the configured project policy.",
    candidate: review.candidate,
    reviewer: review.reviewer ?? null,
    reviewedAt: review.reviewedAt ?? null,
    evidence: review.evidence,
    findings: review.findings ?? []
  };
}
