import { $, renderHeader, renderFooter, setHTML, TYPE_TO_NAV } from "../ui.js";
import { requireAuth, mountAuthSlot } from "../auth.js";

const params = new URLSearchParams(location.search);
const type = params.get("type") || "";

async function init() {
  if (!(await requireAuth())) return;

  renderHeader(TYPE_TO_NAV[type] || "");
  renderFooter();
  mountAuthSlot();

  setHTML(
    $("#main"),
    `<section class="page-head">
       <h1>Archive</h1>
       <p class="muted">Placeholder. The filterable grid, search and add flow arrive in Phase 4.</p>
     </section>
     <div class="placeholder-grid" aria-hidden="true"></div>`
  );
}

init();
