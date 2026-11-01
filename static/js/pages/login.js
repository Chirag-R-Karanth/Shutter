import { $, setHTML, renderFooter } from "../ui.js";
import { getSession, signIn } from "../auth.js";

renderFooter();

// Only allow same-site relative redirects (avoid open-redirects via ?next=).
function safeNext() {
  const raw = new URLSearchParams(location.search).get("next") || "index.html";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("//")) return "index.html";
  return raw;
}

function renderForm() {
  setHTML(
    $("#main"),
    `<section class="login-card">
       <h1>Shutter</h1>
       <p class="muted">Sign in to your archive</p>
       <form id="login-form" novalidate>
         <div class="field">
           <label for="email">Email</label>
           <input class="input" id="email" name="email" type="email"
                  autocomplete="email" required />
         </div>
         <div class="field">
           <label for="password">Password</label>
           <input class="input" id="password" name="password" type="password"
                  autocomplete="current-password" required />
         </div>
         <button class="btn" type="submit" id="login-submit">Sign in</button>
         <p id="login-error" class="form-error" role="alert" hidden></p>
       </form>
     </section>`
  );

  const form = $("#login-form");
  const button = $("#login-submit");
  const error = $("#login-error");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;

    const email = $("#email").value.trim();
    const password = $("#password").value;
    if (!email || !password) {
      error.textContent = "Enter your email and password.";
      error.hidden = false;
      return;
    }

    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      await signIn(email, password);
      location.replace(safeNext());
    } catch (err) {
      error.textContent = err?.message || "Sign in failed.";
      error.hidden = false;
      button.disabled = false;
      button.textContent = "Sign in";
    }
  });
}

async function init() {
  const session = await getSession();
  if (session) {
    location.replace(safeNext());
    return;
  }
  renderForm();
}

init();
