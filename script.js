// Editorial redesign — live data layer.
// Talks directly to rpc.nano.to. No framework, no SDK, BigInt for exact math.

(() => {
  // ----- Hero finality ticker (faux) ---------------------------------------
  const hms = document.getElementById("hms");
  const tFin = document.getElementById("t-finality");
  if (hms || tFin) {
    const samples = [398, 412, 391, 405, 388, 402, 419, 397, 408, 384];
    let i = 0;
    setInterval(() => {
      const v = samples[i % samples.length];
      if (hms) hms.textContent = v;
      if (tFin) tFin.textContent = v;
      i++;
    }, 1700);
  }

  // ----- Smooth-scroll anchors ---------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });

  // ----- Live ticker marquee: duplicate content so it loops seamlessly -----
  const tt = document.getElementById("ticker-track");
  if (tt) tt.insertAdjacentHTML("beforeend", tt.innerHTML);

  // ----- Live decentralization data from rpc.nano.to -----------------------
  const RPC = "https://rpc.nano.to";

  const fmtXno = (raw) => {
    const xno = Number(raw / 1_000_000_000_000_000_000_000_000n) / 1_000_000;
    if (xno >= 1_000_000) return (xno / 1_000_000).toFixed(2) + "M";
    if (xno >= 1_000) return (xno / 1_000).toFixed(1) + "k";
    return xno.toFixed(0);
  };

  const fmtInt = (n) => n.toLocaleString("en-US");
  const shortAddr = (a) => a.slice(0, 11) + "…" + a.slice(-6);

  const rpc = (action, extra) =>
    fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(extra || {}) }),
    }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const renderLive = async () => {
    const list = document.getElementById("reps-list");
    const status = document.getElementById("orv-status");
    if (!list) return;
    try {
      const [quorum, aliases, blocks] = await Promise.all([
        rpc("confirmation_quorum", { peer_details: true }),
        rpc("aliases").catch(() => []),
        rpc("block_count").catch(() => null),
      ]);

      const aliasMap = new Map();
      if (Array.isArray(aliases)) {
        for (const a of aliases) {
          if (a && a.account && a.alias) aliasMap.set(a.account, a.alias);
        }
      }

      const onlineTotal = BigInt(quorum.online_stake_total);
      const quorumDelta = BigInt(quorum.quorum_delta);

      const agg = new Map();
      for (const p of quorum.peers || []) {
        const w = BigInt(p.weight);
        if (w > 0n) agg.set(p.account, (agg.get(p.account) || 0n) + w);
      }
      const reps = Array.from(agg, ([account, weight]) => ({ account, weight }))
        .sort((a, b) => (a.weight < b.weight ? 1 : a.weight > b.weight ? -1 : 0));

      let cum = 0n;
      let nc = 0;
      for (const r of reps) {
        cum += r.weight;
        nc++;
        if (cum >= quorumDelta) break;
      }

      const principalThreshold = onlineTotal / 1000n;
      const principals = reps.filter((r) => r.weight >= principalThreshold).length;
      const topShare = reps[0]
        ? Number((reps[0].weight * 10000n) / onlineTotal) / 100
        : 0;

      setText("nc-num", String(nc));
      setText("ow-num", fmtXno(onlineTotal));
      setText("rp-num", String(principals));
      setText("top-num", topShare.toFixed(1) + "%");
      setText("pc-nc", String(nc));

      setText("t-nc", String(nc));
      setText("t-weight", fmtXno(onlineTotal) + " XNO");
      setText("t-reps", String(principals));

      if (blocks && blocks.count) {
        setText("t-height", fmtInt(parseInt(blocks.count, 10)));
        if (blocks.cemented)
          setText("t-cps", fmtInt(parseInt(blocks.cemented, 10)));
      }

      // ----- Reps list -----
      const top = reps.slice(0, 14);
      list.innerHTML = top
        .map((r, i) => {
          const pct = Number((r.weight * 100000n) / onlineTotal) / 1000;
          const name = aliasMap.get(r.account) || shortAddr(r.account);
          const safe = name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<li class="rep${i < nc ? " quorum" : ""}">
            <span class="rk">${String(i + 1).padStart(2, "0")}</span>
            <span class="nm" title="${r.account}">${safe}</span>
            <span class="r">${pct.toFixed(2)}%</span>
          </li>`;
        })
        .join("");

      // ----- Donut chart -----
      // Editorial palette: forest greens + a few earth/khaki accents,
      // ink-toned grey for "Others" so it reads as the long tail, not a participant.
      const SLICE_COLORS = [
        "#1b5e20", "#2e7d32", "#43a047", "#66bb6a", "#558b2f",
        "#7cb342", "#9ccc65", "#26a69a", "#33691e", "#827717",
        "#8c8775", // "Others"
      ];

      const peerTotal = reps.reduce((s, r) => s + r.weight, 0n);
      const topN = 10;
      const topSlices = reps.slice(0, topN);
      const othersWeight = reps.slice(topN).reduce((s, r) => s + r.weight, 0n);
      const slices = topSlices.map((r, i) => ({
        account: r.account,
        name: aliasMap.get(r.account) || shortAddr(r.account),
        weight: r.weight,
        color: SLICE_COLORS[i],
      }));
      if (othersWeight > 0n) {
        slices.push({
          account: null,
          name: `Others (${reps.length - topN})`,
          weight: othersWeight,
          color: SLICE_COLORS[topN],
        });
      }

      const SVG_NS = "http://www.w3.org/2000/svg";
      const R = 86;
      const C = 2 * Math.PI * R;
      const GAP = 1.2;
      const slicesG = document.getElementById("pie-slices");
      if (slicesG) {
        slicesG.innerHTML = "";
        let offset = 0;
        for (const s of slices) {
          const frac = Number((s.weight * 100000n) / peerTotal) / 100000;
          const arc = Math.max(frac * C - GAP, 0.5);
          const circle = document.createElementNS(SVG_NS, "circle");
          circle.setAttribute("r", String(R));
          circle.setAttribute("fill", "none");
          circle.setAttribute("stroke", s.color);
          circle.setAttribute("stroke-width", "22");
          circle.setAttribute("stroke-dasharray", `${arc} ${C - arc}`);
          circle.setAttribute("stroke-dashoffset", String(-offset));
          circle.setAttribute("class", "pie-slice");
          const title = document.createElementNS(SVG_NS, "title");
          title.textContent = `${s.name} — ${(frac * 100).toFixed(2)}%`;
          circle.appendChild(title);
          slicesG.appendChild(circle);
          offset += frac * C;
        }
      }

      // ----- Legend -----
      const legend = document.getElementById("pie-legend");
      if (legend) {
        legend.innerHTML = slices
          .map((s) => {
            const frac = Number((s.weight * 100000n) / peerTotal) / 1000;
            const safe = s.name
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return `<li>
              <span class="sw" style="background:${s.color}"></span>
              <span class="nm" title="${safe}">${safe}</span>
              <span class="pc">${frac.toFixed(2)}%</span>
            </li>`;
          })
          .join("");
      }

      const updated = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      if (status)
        status.textContent = `Live · rpc.nano.to · updated ${updated}`;
    } catch (err) {
      console.warn("live data failed", err);
      if (status)
        status.textContent =
          "Couldn't load live data. Showing static fallback.";
    }
  };

  renderLive();
  setInterval(renderLive, 60_000);
})();
