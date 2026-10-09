const OWNER_NICKS = ["KirillLegenda", "KirillMatter", "RussiaTop4kovich"];
const MANAGER_NICKS = ["ddlghl", "Fizss45", "ddlghlmaybe", "Fizss38", "cynic_l", "Normal_Fanftc"];

function roleOfNick(nick) {
  const key = String(nick || "").trim().toLowerCase();
  if (OWNER_NICKS.some(n => n.toLowerCase() === key)) return "owner";
  if (MANAGER_NICKS.some(n => n.toLowerCase() === key)) return "manager";
  return null;
}

function styledNick(nick, withTag) {
  const role = roleOfNick(nick);
  const safe = esc(nick);
  if (!role) return safe;
  const cls = role === "owner" ? "role-owner" : "role-manager";
  const label = role === "owner" ? "Owner" : "Staff";
  return `<span class="${cls}">${safe}</span>` + (withTag ? `<span class="role-tag ${cls}">${label}</span>` : "");
}
