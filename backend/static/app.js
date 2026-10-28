const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let categories = [], editingId = null;

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || res.statusText); }
  return res.status === 204 ? null : res.json();
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.style.display = "block"; setTimeout(() => (t.style.display = "none"), 2600); }
const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };

// ---------- tabs
function show(tab) {
  $("#discover").hidden = tab !== "discover"; $("#admin").hidden = tab !== "admin";
  $("#t-discover").ariaCurrent = tab === "discover"; $("#t-admin").ariaCurrent = tab === "admin";
  if (tab === "admin") loadAdmin();
}
$("#t-discover").onclick = () => show("discover"); $("#t-admin").onclick = () => show("admin");

// ---------- discover
const chips = (p) => `<span class="chip ${p.difficulty}">${p.difficulty}</span>` + (p.required_skills || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
async function search(e) {
  e?.preventDefault();
  const q = $("#q").value.trim(), semantic = document.querySelector("[name=mode]:checked").value === "semantic";
  let data;
  if (semantic && q.length >= 2) {
    const p = new URLSearchParams({ q });
    if ($("#f-diff").value) p.set("difficulty", $("#f-diff").value);
    data = (await api("/search/semantic?" + p)).items;
  } else {
    const p = new URLSearchParams({ sort: q && $("#f-sort").value === "newest" ? "relevance" : $("#f-sort").value });
    if (q) p.set("q", q);
    if ($("#f-cat").value) p.set("category_id", $("#f-cat").value);
    if ($("#f-diff").value) p.set("difficulty", $("#f-diff").value);
    if ($("#f-skills").value.trim()) p.set("skills", $("#f-skills").value);
    if ($("#f-open").checked) p.set("has_open_issues", "true");
    data = (await api("/projects?" + p)).items;
  }
  $("#results").innerHTML = data.length ? data.map((p) => `
    <article class="row" tabindex="0" data-id="${p.project_id}">
      <h3>${esc(p.title)}</h3><div class="meta">${p.score != null ? "match " + Math.round(p.score * 100) + "%" : "&#9733; " + p.stars}</div>
      <p>${esc(p.description).slice(0, 160)}</p><div class="meta">${p.open_issues} open issues</div>
      <div class="chips">${chips(p)}</div></article>`).join("")
    : `<div class="empty">No projects match. Try fewer filters or a broader search.</div>`;
}
$("#search-form").onsubmit = run(search);
["#f-cat", "#f-diff", "#f-sort", "#f-open"].forEach((s) => ($(s).onchange = run(search)));
$("#f-skills").onchange = run(search);
document.querySelectorAll("[name=mode]").forEach((r) => (r.onchange = run(search)));
$("#results").onclick = run((e) => { const r = e.target.closest(".row"); if (r) return openDetail(r.dataset.id); });
$("#results").onkeydown = run((e) => { if (e.key === "Enter") { const r = e.target.closest(".row"); if (r) return openDetail(r.dataset.id); } });

async function openDetail(id) {
  const [p, a, sim, contribs] = await Promise.all([api(`/projects/${id}`), api(`/analytics/projects/${id}`),
    api(`/projects/${id}/similar`).catch(() => []), api(`/projects/${id}/contributions`)]);
  $("#detail").innerHTML = `
    <h2>${esc(p.title)}</h2><p>${esc(p.description)}</p>
    <div class="chips">${chips(p)}<span class="chip">${esc(p.category || "Uncategorised")}</span></div>
    ${p.repo_url ? `<p><a href="${esc(p.repo_url)}" target="_blank" rel="noopener">${esc(p.repo_url)}</a></p>` : ""}
    <div class="stats" style="margin-top:16px">
      <div class="stat"><b>${a.health_score}</b><span>Health score</span></div>
      <div class="stat"><b>${a.open_issues}/${a.total_issues}</b><span>Open issues</span></div>
      <div class="stat"><b>${a.contributors}</b><span>Contributors</span></div>
      <div class="stat"><b>${a.resolution_rate}%</b><span>Issues resolved</span></div></div>
    <h3>Issues</h3>${p.issues.length ? p.issues.map((i) => `<p style="margin:6px 0"><span class="chip">${i.status}</span> ${esc(i.title)} <span class="chip">${esc(i.label)}</span></p>`).join("") : "<p>No issues yet.</p>"}
    <h3 style="margin-top:16px">Recent contributions</h3>${contribs.length ? contribs.slice(0, 5).map((c) => `<p style="margin:4px 0">${esc(c.developer)}: ${c.type}, ${c.status}, ${c.lines_changed} lines</p>`).join("") : "<p>None yet.</p>"}
    <h3 style="margin-top:16px">Similar projects</h3>${sim.length ? sim.map((s) => `<p style="margin:4px 0">${esc(s.title)} <span class="stale">${Math.round(s.score * 100)}% similar</span></p>`).join("") : "<p>Not available until the embedding is synced.</p>"}
    <p style="text-align:right"><button class="btn ghost" onclick="document.querySelector('#detail').close()">Close</button></p>`;
  $("#detail").showModal();
}

// ---------- admin
const bars = (rows, k) => { const m = Math.max(...rows.map((r) => r.projects), 1);
  return rows.map((r) => `<div><span>${esc(r[k])}</span><i style="width:${(r.projects / m) * 100}%"></i><b>${r.projects}</b></div>`).join(""); };
async function loadAdmin() {
  const [o, list] = await Promise.all([api("/analytics/overview"), api("/projects?status=&limit=100&sort=title")]);
  $("#stats").innerHTML = [["projects", "Projects"], ["active_projects", "Active"], ["open_issues", "Open issues"], ["contributions", "Contributions"]]
    .map(([k, l]) => `<div class="stat"><b>${o[k]}</b><span>${l}</span></div>`).join("")
    + `<div class="stat ${o.stale_embeddings ? "warn" : ""}"><b>${o.stale_embeddings}</b><span>Stale embeddings</span></div>`;
  $("#by-cat").innerHTML = bars(o.by_category, "category"); $("#top-skills").innerHTML = bars(o.top_skills, "name");
  $("#admin-rows").innerHTML = list.items.map((p) => `<tr><td>${esc(p.title)}</td><td>${esc(p.category || "-")}</td><td>${p.difficulty}</td><td>${p.open_issues}</td>
    <td>${p.embedding_stale ? '<span class="stale">stale</span>' : "up to date"}</td>
    <td style="white-space:nowrap"><button class="btn ghost sm" data-act="issue" data-id="${p.project_id}">Add issue</button>
    <button class="btn ghost sm" data-act="contrib" data-id="${p.project_id}">Log contribution</button>
    <button class="btn ghost sm" data-act="edit" data-id="${p.project_id}">Edit</button>
    <button class="btn danger sm" data-act="del" data-id="${p.project_id}">Delete</button></td></tr>`).join("");
}
$("#admin-rows").onclick = run(async (e) => {
  const b = e.target.closest("button"); if (!b) return; const id = b.dataset.id;
  if (b.dataset.act === "edit") return openEditor(await api(`/projects/${id}`));
  if (b.dataset.act === "del" && confirm("Delete this project and its issues?")) { await api(`/projects/${id}`, { method: "DELETE" }); toast("Project deleted"); loadAdmin(); }
  if (b.dataset.act === "issue") { const title = prompt("Issue title"); if (title) { await api(`/projects/${id}/issues`, { method: "POST", body: { title } }); toast("Issue added"); loadAdmin(); } }
  if (b.dataset.act === "contrib") {
    const dev = prompt("Developer user id (see users table)"); if (!dev) return;
    const issue = prompt("Issue id this resolves (blank for none)");
    await api(`/projects/${id}/contributions`, { method: "POST", body: { developer_id: +dev, issue_id: issue ? +issue : null, status: "merged", lines_changed: +(prompt("Lines changed", "0") || 0) } });
    toast("Contribution recorded"); loadAdmin();
  }
});
$("#sync-btn").onclick = run(async () => { const r = await api("/embeddings/sync", { method: "POST" }); toast(`${r.synced} embeddings refreshed`); loadAdmin(); });
$("#new-btn").onclick = () => openEditor(null);
$("#e-cancel").onclick = () => $("#editor").close();

function openEditor(p) {
  editingId = p?.project_id ?? null; $("#edit-title").textContent = p ? "Edit project" : "New project";
  $("#e-title").value = p?.title ?? ""; $("#e-desc").value = p?.description ?? ""; $("#e-repo").value = p?.repo_url ?? "";
  $("#e-cat").innerHTML = `<option value="">None</option>` + categories.map((c) => `<option value="${c.category_id}">${esc(c.name)}</option>`).join("");
  $("#e-cat").value = p?.category_id ?? ""; $("#e-diff").value = p?.difficulty ?? "beginner"; $("#e-status").value = p?.status ?? "active";
  $("#e-stars").value = p?.stars ?? 0; $("#e-skills").value = (p?.required_skills ?? []).join(", ");
  $("#editor").showModal();
}
$("#edit-form").onsubmit = run(async (e) => {
  e.preventDefault();
  const body = { title: $("#e-title").value, description: $("#e-desc").value, repo_url: $("#e-repo").value || null,
    category_id: $("#e-cat").value ? +$("#e-cat").value : null, difficulty: $("#e-diff").value, status: $("#e-status").value,
    stars: +$("#e-stars").value, required_skills: $("#e-skills").value.split(",").map((s) => s.trim()).filter(Boolean) };
  await api(editingId ? `/projects/${editingId}` : "/projects", { method: editingId ? "PATCH" : "POST", body });
  $("#editor").close(); toast("Project saved"); loadAdmin();
});

(run(async () => {
  categories = await api("/categories");
  $("#f-cat").innerHTML += categories.map((c) => `<option value="${c.category_id}">${esc(c.name)}</option>`).join("");
  await search();
}))();
