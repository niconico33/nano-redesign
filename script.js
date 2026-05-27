// Small flourishes: animate the finality time, smooth-scroll anchors,
// and gently shimmer the hero gradient on cursor.

(() => {
  const ms = document.getElementById("ms");
  if (ms) {
    const targets = [398, 412, 391, 405, 388, 402, 419, 397];
    let i = 0;
    setInterval(() => {
      ms.textContent = targets[i % targets.length];
      i++;
    }, 1600);
  }

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

  const bg = document.querySelector(".hero-bg");
  if (bg && window.matchMedia("(pointer:fine)").matches) {
    document.addEventListener("mousemove", (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      bg.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // ----- Live decentralization data from rpc.nano.to -----
  const RPC = "https://rpc.nano.to";
  const RAW = 1_000_000_000_000_000_000_000_000_000_000n;

  const fmtXno = (raw) => {
    const xno = Number(raw / 1_000_000_000_000_000_000_000_000n) / 1_000_000;
    if (xno >= 1_000_000) return (xno / 1_000_000).toFixed(2) + "M";
    if (xno >= 1_000) return (xno / 1_000).toFixed(1) + "k";
    return xno.toFixed(0);
  };

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

  const renderReps = async () => {
    const list = document.getElementById("reps-list");
    const status = document.getElementById("orv-status");
    if (!list) return;
    try {
      const [quorum, aliases] = await Promise.all([
        rpc("confirmation_quorum", { peer_details: true }),
        rpc("aliases").catch(() => []),
      ]);

      const aliasMap = new Map();
      if (Array.isArray(aliases)) {
        for (const a of aliases) {
          if (a && a.account && a.alias) aliasMap.set(a.account, a.alias);
        }
      }

      const onlineTotal = BigInt(quorum.online_stake_total);
      const quorumDelta = BigInt(quorum.quorum_delta);

      const peers = (quorum.peers || [])
        .map((p) => ({ account: p.account, weight: BigInt(p.weight) }))
        .filter((p) => p.weight > 0n)
        .sort((a, b) => (a.weight < b.weight ? 1 : a.weight > b.weight ? -1 : 0));

      // Aggregate by account in case the same rep appears across multiple peers
      const agg = new Map();
      for (const p of peers) {
        agg.set(p.account, (agg.get(p.account) || 0n) + p.weight);
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

      const principalThreshold = onlineTotal / 1000n; // 0.1%
      const principals = reps.filter((r) => r.weight >= principalThreshold).length;

      document.getElementById("nc-num").textContent = nc.toString();
      document.getElementById("ow-num").textContent = fmtXno(onlineTotal);
      document.getElementById("rp-num").textContent = principals.toString();
      const pcNc = document.getElementById("pc-nc");
      if (pcNc) pcNc.textContent = nc.toString();

      const top = reps.slice(0, 12);
      const maxW = top[0]?.weight || 1n;

      list.innerHTML = top
        .map((r, i) => {
          const pctBasis = Number((r.weight * 100000n) / onlineTotal) / 1000;
          const barPct = Number((r.weight * 10000n) / maxW) / 100;
          const name = aliasMap.get(r.account) || shortAddr(r.account);
          const safeName = name
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<li class="rep${i < nc ? " quorum" : ""}">
            <span class="rk">${i + 1}</span>
            <span class="nm" title="${r.account}">${safeName}</span>
            <span class="br"><i style="width:${barPct.toFixed(2)}%"></i></span>
            <span class="r">${pctBasis.toFixed(2)}%</span>
          </li>`;
        })
        .join("");

      // --- Donut chart ---
      const SLICE_COLORS = [
        "#1b5e20", "#388e3c", "#66bb6a", "#0d7c4f", "#33691e",
        "#558b2f", "#7cb342", "#9ccc65", "#26a69a", "#43a047",
        "#3a4a3d", // "Others"
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
      const GAP = 1.4; // visual gap between slices in path units
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
          circle.setAttribute("stroke-width", "28");
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

      // --- Legend ---
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
      status.textContent = `Live · rpc.nano.to · updated ${updated}`;
    } catch (err) {
      console.warn("orv live data failed", err);
      status.textContent =
        "Couldn't load live data. Showing static link to nanoticker.org instead.";
      list.innerHTML = "";
    }
  };

  renderReps();
  setInterval(renderReps, 60_000);
})();
