import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function typographyRules(config) {
  return {
    sansFamily: String(config.typography?.sansFamily || "Arial, sans-serif"),
    accentFamily: String(config.typography?.accentFamily || "Georgia, serif"),
    eyebrowSize: Number(config.typography?.eyebrowSize || 18),
    headlineOneSize: Number(config.typography?.headlineOneSize || 76),
    headlineTwoSize: Number(config.typography?.headlineTwoSize || 74),
    supportingSize: Number(config.typography?.supportingSize || 24),
    destinationSize: Number(config.typography?.destinationSize || 23)
  };
}

export function stableCardInput(config, card, name) {
  return {
    contractVersion: 2,
    templateVersion: String(config.templateVersion || "1"),
    seoContractVersion: String(config.seoContractVersion || "1"),
    width: config.width || 1200,
    height: config.height || 630,
    name,
    lineOne: String(card.lineOne || ""),
    lineTwo: String(card.lineTwo || ""),
    eyebrow: String(card.eyebrow || config.eyebrow || ""),
    tagline: String(card.tagline || config.tagline || ""),
    displayUrl: String(card.displayUrl || config.domain || ""),
    mark: String(card.mark || config.mark || "GFL"),
    colors: {
      background: String(config.colors?.background || "#07110f"),
      accent: String(config.colors?.accent || "#d6ff70"),
      secondary: String(config.colors?.secondary || "#83f3c8")
    },
    typography: typographyRules(config),
    sourceAssetSha256: String(card.sourceAssetSha256 || ""),
    brandAssetSha256: String(card.brandAssetSha256 || config.brandAssetSha256 || ""),
    renderingFingerprint: card.renderingFingerprint ?? null
  };
}

export function stableVisualSystemInput(config) {
  const adoptionGate = config.adoptionGate || {};
  const rendererContract = adoptionGate.rendererContract || {};
  return {
    contractVersion: 1,
    templateVersion: String(config.templateVersion || "1"),
    seoContractVersion: String(config.seoContractVersion || "1"),
    width: config.width || 1200,
    height: config.height || 630,
    colors: {
      background: String(config.colors?.background || "#07110f"),
      accent: String(config.colors?.accent || "#d6ff70"),
      secondary: String(config.colors?.secondary || "#83f3c8")
    },
    typography: typographyRules(config),
    brandRules: config.brandRules || null,
    brandAssetSha256: String(config.brandAssetSha256 || ""),
    brandReferenceSha256: String(adoptionGate.brandReferenceSha256 || ""),
    rendererContract: {
      kind: String(rendererContract.kind || ""),
      name: String(rendererContract.name || ""),
      version: String(rendererContract.version || ""),
      sourceSha256: String(rendererContract.sourceSha256 || "")
    }
  };
}

export function visualSystemSha256(config) {
  return sha256(JSON.stringify(stableVisualSystemInput(config)));
}

export function prototypeCards(config) {
  const configured = new Map(
    (config.cards || []).map((card) => [card.name || card.slug, card])
  );
  return (config.adoptionGate?.prototypeCardNames || [])
    .map((name) => configured.get(name))
    .filter(Boolean);
}

export function validateAdoptionGate(config) {
  const failures = [];
  const gate = config.adoptionGate;
  if (!gate) {
    failures.push("Explicit regeneration requires adoptionGate and an approved representative prototype");
    return failures;
  }

  if (!/^[a-f0-9]{64}$/i.test(String(gate.brandReferenceSha256 || ""))) {
    failures.push("adoptionGate.brandReferenceSha256 must identify the authoritative brand reference");
  }

  const renderer = gate.rendererContract || {};
  if (!["project-owned", "toolkit-reference"].includes(renderer.kind)) {
    failures.push("adoptionGate.rendererContract.kind must be project-owned or toolkit-reference");
  }
  if (renderer.kind === "project-owned" && typeof config.renderCard !== "function") {
    failures.push("A project-owned renderer contract requires config.renderCard");
  }
  if (renderer.kind === "toolkit-reference" && typeof config.renderCard === "function") {
    failures.push("A toolkit-reference renderer contract cannot describe config.renderCard");
  }
  if (!renderer.name) failures.push("adoptionGate.rendererContract.name is required");
  if (!renderer.version) failures.push("adoptionGate.rendererContract.version is required");
  if (!/^[a-f0-9]{64}$/i.test(String(renderer.sourceSha256 || ""))) {
    failures.push("adoptionGate.rendererContract.sourceSha256 must identify the reviewed renderer source");
  }

  const names = gate.prototypeCardNames || [];
  const configuredNames = new Set((config.cards || []).map((card) => card.name || card.slug));
  const minimum = Math.min(
    Math.max(1, Number(gate.minimumPrototypeCards || 3)),
    configuredNames.size
  );
  if (!Array.isArray(names) || names.length < minimum) {
    failures.push(`adoptionGate.prototypeCardNames must contain at least ${minimum} representative card(s)`);
  }
  if (new Set(names).size !== names.length) {
    failures.push("adoptionGate.prototypeCardNames must not contain duplicates");
  }
  for (const name of names) {
    if (!configuredNames.has(name)) failures.push(`Prototype card is not configured: ${name}`);
  }

  const requiredCases = new Set(gate.requiredCases || []);
  if (!requiredCases.has("publication-identity")) {
    failures.push("adoptionGate.requiredCases must include publication-identity");
  }
  if (!requiredCases.has("long-headline")) {
    failures.push("adoptionGate.requiredCases must include long-headline");
  }
  const coveredCases = new Set(
    (gate.prototypeCases || []).flatMap((entry) => entry.cases || [])
  );
  for (const requiredCase of requiredCases) {
    if (!coveredCases.has(requiredCase)) {
      failures.push(`Prototype set does not cover required case: ${requiredCase}`);
    }
  }
  for (const entry of gate.prototypeCases || []) {
    if (!names.includes(entry.name)) {
      failures.push(`Prototype case references a card outside prototypeCardNames: ${entry.name}`);
    }
  }

  return failures;
}

export function validatePrototypeApproval(config, approval) {
  const failures = validateAdoptionGate(config);
  if (!approval || approval.kind !== "open-graph-adoption-prototype" || approval.version !== 1) {
    failures.push("Representative Open Graph prototype approval is missing or unsupported");
    return failures;
  }

  const expectedVisualSystem = visualSystemSha256(config);
  if (approval.visualSystemSha256 !== expectedVisualSystem) {
    failures.push("Representative Open Graph prototype approval is stale for the current visual system");
  }

  const expectedCards = prototypeCards(config)
    .map((card) => {
      const name = card.name || card.slug;
      return {
        name,
        inputSha256: sha256(JSON.stringify(stableCardInput(config, card, name)))
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const approvedCards = (approval.cards || [])
    .map(({ name, inputSha256 }) => ({ name, inputSha256 }))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (JSON.stringify(approvedCards) !== JSON.stringify(expectedCards)) {
    failures.push("Representative Open Graph prototype approval does not match the current prototype inputs");
  }
  for (const card of approval.cards || []) {
    if (!/^[a-f0-9]{64}$/i.test(String(card.sha256 || ""))) {
      failures.push(`Prototype approval is missing a valid output hash for ${card.name || "an unnamed card"}`);
    }
  }

  const review = approval.reviewContract || {};
  const isPlaceholder = (value) => !value || /^REPLACE\b/i.test(String(value).trim());
  if (isPlaceholder(review.reviewer)) failures.push("Prototype approval requires a named reviewer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(review.reviewedOn || ""))) {
    failures.push("Prototype approval requires reviewedOn in YYYY-MM-DD format");
  }
  if (isPlaceholder(review.brandReference)) failures.push("Prototype approval requires a brand reference");
  if (isPlaceholder(review.realClient)) failures.push("Prototype approval requires the real messaging or social client used for preview");
  if (review.brandAuthorityApproved !== true) failures.push("Prototype approval requires brand authority confirmation");
  if (review.templateAppropriateApproved !== true) failures.push("Prototype approval requires template appropriateness confirmation");
  if (review.typographyApproved !== true) failures.push("Prototype approval requires typography confirmation");
  if (review.paletteApproved !== true) failures.push("Prototype approval requires palette confirmation");
  if (review.imageryApproved !== true) failures.push("Prototype approval requires imagery confirmation");
  if (review.noUnapprovedSyntheticArtwork !== true) {
    failures.push("Prototype approval must reject unapproved synthetic artwork and decorative geometry");
  }

  return failures;
}
