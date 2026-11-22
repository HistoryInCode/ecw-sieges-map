/* GoatCounter integration for the siege map.
   The map page records visits; helper pages can read the same map-only count
   without loading the tracker. GoatCounter handles visit/session deduplication. */
window.SiegeViews = (function () {
  "use strict";
  const LOCAL = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(location.hostname) || location.protocol === "file:";
  const withTimeout = (p, ms) => Promise.race([
    p,
    new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))
  ]);
  const getJSON = url => withTimeout(
    fetch(url, { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))),
    20000
  );

  // count=true on the map page; count=false on pages that only display the total.
  async function run(vc, count) {
    if (!vc || vc.service !== "goatcounter" || !vc.goatcounter) return null;
    const base = `https://${vc.goatcounter}.goatcounter.com`;

    try {
      if (count && !LOCAL && (!vc.countOn || [].concat(vc.countOn).includes(location.hostname))) {
        // Load the tracker only on the map page. GoatCounter itself handles
        // session-based visit counting, so refreshing does not inflate visits.
        if (!document.querySelector('script[data-goatcounter="' + base + '/count"]')) {
          const s = document.createElement("script");
          s.async = true;
          s.src = "https://gc.zgo.at/count.js";
          s.dataset.goatcounter = base + "/count";
          document.head.appendChild(s);
        }
      }

      // Read the map's path-specific total. The To-do page calls run(..., false),
      // so it displays this value without recording a visit of its own.
      const path = vc.path || "/ecw-sieges-map/";
      const j = await getJSON(`${base}/counter/${encodeURIComponent(path)}.json`);
      if (j.count == null) return null;
      const value = Number(String(j.count).replace(/[^\d]/g, ""));
      return Number.isFinite(value) ? value : null;
    } catch (e) {
      return null;
    }
  }

  // Writes e.g. "Viewed 1,234 times since November 2026" into an element.
  function show(el, n, vc) {
    if (!el || n == null) return;
    const since = vc.since ? ` since ${vc.since}` : "";
    el.textContent = (vc.label || "Viewed {n} times{since}")
      .replace("{n}", n.toLocaleString("en-GB"))
      .replace("{since}", since);
    el.hidden = false;
  }

  return { run, show };
})();
