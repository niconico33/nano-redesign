# nano.org — focused redesign

A single-page, fan-made redesign of nano.org that strips the page back to what
actually makes Nano interesting:

- **Fast** — ~400 ms median time to finality
- **Feeless** — every transaction is $0.00, always
- **Fixed supply** — 133,248,297 XNO, fully distributed, no new issuance
- **Block-lattice DAG** — explained with an inline SVG diagram
- **Open Representative Voting (ORV)** — illustrated with a live embed of
  [nanoticker.org/weight](https://nanoticker.org/weight)

The page is intentionally light on the eco-marketing copy and heavy on the
mechanical reasons the protocol works.

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
- `styles.css` — dark theme, brand gradient, layout
- `script.js` — small UX touches (live finality ticker, smooth scroll, hero parallax)

## Notes

- The block-lattice figure is a hand-drawn SVG inspired by Figure 3 of the
  [Nano whitepaper](https://content.nano.org/whitepaper/Nano_Whitepaper_en.pdf).
- The ORV section embeds `nanoticker.org/weight` in an iframe. If their site
  ever sets `X-Frame-Options: DENY`, the overlay link still routes users to the
  live page.
- This is an unofficial redesign and is not affiliated with the Nano Foundation.
