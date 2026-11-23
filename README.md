# FoveaWAM

Project page for *FoveaWAM: Role-Aware 4D World–Action Modeling for Dynamic Manipulation*.

[English](https://foveawam.github.io/) · [中文](https://foveawam.github.io/review-zh.html)

## Preview

From the repository root, run `node preview.mjs` and open [the local project page](http://127.0.0.1:4173/). The server binds to loopback and supports video byte-range requests. To use another port, run `node preview.mjs 4174`.

## Update the pages

- Edit `dist/review.html` for the English page. The root `dist/index.html` forwards visitors to it and preserves section links.
- Run `python make_zh.py` after editing the English page. This generates `dist/review-zh.html`. Update the translation pairs in the script if the English wording changes. The checked-in pages use LF line endings.
- `dist/review.css` and `dist/styles.css` define the layout. `dist/app.js`, `dist/review-media.js` and `dist/real-demos.js` handle the figures, BibTeX and video players.

## Figures and videos

The figures use the manuscript's high-resolution artwork. The video catalog in `dist/media.json` lists the 14 OnTimeBench tasks and six real-robot comparisons. Each real-robot comparison pairs a selected FoveaWAM success with a selected π₀.₅ failure.

To regenerate the 640 × 420 real-robot previews and covers, install FFmpeg and run `python build_real_previews.py`. The comparison dialogs play the full-resolution clips in `dist/assets/real/showcase/`.

## Publish

Merge changes into `main` through a pull request. GitHub Actions verifies the generated Chinese page and deploys `dist/` to GitHub Pages.
