# nano.org — focused redesign

A single-page redesign of nano.org

- **Fast** — ~400 ms median time to finality
- **Feeless** — every transaction is $0.00, always
- **Fixed supply** — 133,248,297 XNO, fully distributed, no new issuance
- **Block-lattice DAG** — explained with an inline SVG diagram
- **Open Representative Voting (ORV)** — illustrated with live data pulled
  directly from [rpc.nano.to](https://rpc.nano.to): Nakamoto coefficient,
  online voting weight, top representatives, and a donut chart of weight
  distribution

The page is intentionally light, ISO Linux Nano.

## Run it

It's a static page, no build step:

```bash
# from this directory
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just double-click `index.html`.

## Files

- `index.html` — markup and content
- `styles.css` — light editorial theme, forest-green accent, layout
- `script.js` — live network ticker, live ORV data, smooth scroll

## Notes

- The block-lattice figure is a hand-drawn SVG inspired by Figure 3 of the
  [Nano whitepaper](https://content.nano.org/whitepaper/Nano_Whitepaper_en.pdf).
- The ORV panel calls `confirmation_quorum`, `aliases`, and `block_count`
  against `rpc.nano.to` (public, CORS-open, no API key) and computes the
  Nakamoto coefficient client-side with native `BigInt`.
- This is an unofficial redesign and is not affiliated with the Nano
  Foundation.
