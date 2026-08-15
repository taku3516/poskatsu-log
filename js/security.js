export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);
}

export function createImportedActivityIdentity(sourceId, idFactory) {
  return {
    id: idFactory("import"),
    sourceId: String(sourceId || "")
  };
}

export function csvEscape(value) {
  let text = String(value ?? "");
  if (/^[\t ]*[=+@-]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
