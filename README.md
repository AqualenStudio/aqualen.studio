\# 🌌 Aqualen Studio



> "We build worlds — and drown the ordinary."



This repository contains the official web code of \*\*Aqualen Studio\*\*, operating under \*\*Joytoart Gaming Ltd.\*\*

What you see here is public — but not yours.



---



🌐 Website: https://aqualen.studio  

📡 Updates: Experimental. Unstable. Alive.

🎮 Playable builds: Capy Survival — archived browser prototype (`demo-rogue.html`).



---



⚠️ LEGAL FIELD



You are free to explore, inspect, and learn.  

You are \*\*not\*\* allowed to:



\- Copy the assets  

\- Use branding, visuals, or game content  

\- Redistribute or host any part of the code  

\- Claim association with Aqualen Studio or Joytoart Gaming  



Unauthorized usage may result in legal action.



---



© 2025 Joytoart Gaming Ltd.  

Aqualen Studio — All Rights Reserved.

## Local development

This is a static multi-game studio website. Edit `site/` templates rather than generated root HTML files.

```sh
node scripts/build.mjs
node scripts/check.mjs
node --experimental-vm-modules scripts/test-capy.mjs
node scripts/serve.mjs
```

Preview: <http://127.0.0.1:4173/>. Deploy the generated HTML together with `assets/`; no server-side runtime is required. Serve `.mjs` files with a JavaScript MIME type. See [DESIGN.md](DESIGN.md) for the visual system and maintenance notes.

## Third-party fonts

The studio's restrictions above do not override the licenses of third-party fonts. Cormorant Garamond and Noto Serif JP subsets in `assets/fonts/` are distributed under the SIL Open Font License 1.1; their original copyright notices and licenses are included alongside the files. Run `node scripts/fonts.mjs` only when updating font subsets; this maintenance command downloads from Google Fonts and requires network access.



