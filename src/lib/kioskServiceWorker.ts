export function refuseKioskWorker(production: boolean, hostname: string, iframe: boolean, search: string) {
  return !production || iframe || hostname.startsWith("id-preview--") || hostname.startsWith("preview--") || ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || new URLSearchParams(search).get("sw") === "off";
}

export async function registerKioskWorker() {
  if (!("serviceWorker" in navigator)) return;
  let iframe = true;
  try { iframe = window.self !== window.top; } catch { /* fail closed */ }
  if (refuseKioskWorker(import.meta.env.PROD, location.hostname, iframe, location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(worker => worker && new URL(worker.scriptURL).pathname === "/sw.js")).map(r => r.unregister()));
    return;
  }
  if (!/^\/compass\/(demo|persona)\//.test(location.pathname)) return;
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
}