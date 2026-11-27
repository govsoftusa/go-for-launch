export function dnsName(value) {
  return String(value ?? "").toLowerCase().replace(/\.$/, "");
}

export function matchesService(record, spec) {
  if (record?.type !== spec.type || dnsName(record.name) !== dnsName(spec.name)) return false;
  const [priority, target, ...params] = String(record.data).trim().split(/\s+/);
  const values = new Map(params.map((field) => {
    const i = field.indexOf("=");
    return [field.slice(0, i), field.slice(i + 1).replace(/^"(.*)"$/, "$1")];
  }));
  return /^\d+$/.test(priority) && Number(priority) > 0 && Number(priority) <= 65535
    && Boolean(target) && (!spec.target || dnsName(target) === dnsName(spec.target))
    && Boolean(values.get("alpn")) && (!spec.alpn || values.get("alpn").split(",").includes(spec.alpn))
    && validEndpoint(values.get("key65400") ?? values.get("endpoint"), spec.endpoint);
}

function validEndpoint(value, expected) {
  try {
    return new URL(value).protocol === "https:" && (!expected || value === expected);
  } catch {
    return false;
  }
}

export function authenticatedAnswer(answer, name, type) {
  return answer?.Status === 0 && answer.AD === true && answer.CD !== true && answer.TC !== true
    && Array.isArray(answer.Question) && answer.Question.some(q => q?.type === type && dnsName(q.name) === dnsName(name));
}

// Quoted parameter values and URI references may themselves contain commas.
export function parseLinkHeader(header) {
  const links = [];
  const entries = String(header ?? "").match(/(?:<[^>]*>|"(?:\\.|[^"\\])*"|[^,<"]+)+/g) ?? [];
  for (const entry of entries) {
    const target = /^\s*<([^>]+)>/.exec(entry);
    if (!target) continue;
    const params = entry.slice(target[0].length);
    const relations = [];
    for (const match of params.matchAll(/;\s*([\w-]+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^;,\s]+))/g)) {
      if (match[1].toLowerCase() === "rel") relations.push(...(match[2] ?? match[3]).toLowerCase().trim().split(/\s+/));
    }
    links.push({ target: target[1], relations });
  }
  return links;
}
