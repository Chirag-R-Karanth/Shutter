import { $, renderHeader, renderFooter, setHTML, TYPE_TO_NAV } from "../ui.js";
import { requireAuth, mountAuthSlot } from "../auth.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") || "";

async function init() {
  if (!(await requireAuth())) return;

  renderHeader(TYPE_TO_NAV[type] || "");
  renderFooter();
  mountAuthSlot();

  setHTML(
    $("#main"),
    `<section class="page-head">
       <h1>${id ? "Edit entry" : "New entry"}</h1>
       <p class="muted">Placeholder. The add/edit/delete form arrives in Phase 4.</p>
     </section>`
  );
}

init();
