import { supabase } from "./supabase.js";

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Redirect to login when there is no session; return the session otherwise.
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const next = encodeURIComponent(`${location.pathname.split("/").pop()}${location.search}`);
    location.replace(`login.html?next=${next}`);
    return null;
  }
  return session;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

// Keep the header's auth slot in sync on every page.
export async function mountAuthSlot() {
  const slot = document.getElementById("auth-slot");
  if (!slot) return;
  const session = await getSession();
  if (!session) {
    slot.innerHTML = `<a class="nav-link" href="login.html">Sign in</a>`;
    return;
  }
  slot.innerHTML = `<button type="button" class="nav-link" data-signout>Sign out</button>`;
  slot.querySelector("[data-signout]")?.addEventListener("click", async () => {
    await signOut();
    location.href = "login.html";
  });
}
