import { $, renderHeader, renderFooter, setHTML } from "../ui.js";
import { requireAuth, mountAuthSlot } from "../auth.js";

async function init() {
  if (!(await requireAuth())) return;

  renderHeader("stats");
  renderFooter();
  mountAuthSlot();

  setHTML(
    $("#main"),
    `<section class="page-head">
       <h1>Stats</h1>
       <p class="muted">Placeholder. Counts, averages, distribution and export/import arrive in Phase 5.</p>
     </section>`
  );
}

init();
