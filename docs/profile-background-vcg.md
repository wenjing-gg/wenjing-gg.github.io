# Profile Background VCG Shortlist

This page keeps the homepage background workflow explicit: use only licensed VCG downloads in the repository, keep preview/watermarked images out of git, and preserve the current glass readability layer.

## Current State

- Deployed background: `images/profile-bg-medtech.jpg`
- Design direction: medical imaging, healthcare technology, abstract geometry, light cyan/teal base with subtle gold/lilac accents.
- UI treatment: glass panels over a bright background, so the image should be calm, low-contrast, and have no important text or faces near the center-left content area.
- Replacement rule: after downloading a licensed VCG image, process it with `scripts/prepare_profile_background.sh` and commit only the optimized output.

## Shortlist

| Rank | VCG page | Image ID | Fit | Notes |
| --- | --- | --- | --- | --- |
| 1 | <https://www.vcg.com/creative/1613502817> | `VCG41N2254772632` | Best overall | Modern healthcare/medical innovation banner with hexagonal geometry. Works well with glass panels because the detail is abstract and horizontally composed. |
| 2 | <https://www.vcg.com/creative/1373161793> | `VCG41N1384858271` | Strong backup | Blue medical technology vector banner. Cleanest choice if the page should feel more technical and less photographic. |
| 3 | <https://www.vcg.com/creative/1198738725> | `VCG41N1133606729` | Good atmosphere | Abstract medical technology concept. Use if the licensed file has enough quiet space after cropping. |
| 4 | <https://www.vcg.com/creative/1340091989> | `VCG211340091989` | Minimal option | Abstract medical background. Softer and safer for text readability, but less distinctive. |

## Selection Checklist

- The asset is licensed for web/personal homepage use.
- The downloaded file is high resolution, preferably at least `2400px` wide.
- No VCG watermark or preview overlay remains in the file.
- The visual weight sits on the right/top or is evenly abstract; the left and center should stay readable behind glass.
- The image still looks good with the existing pale overlay and cyan/gold accents.
- The final optimized file stays below about `700 KB` unless the licensed source needs more detail.

## Replacement Workflow

1. Download the licensed VCG file outside the repository, for example to `~/Downloads`.
2. Run:

   ```bash
   scripts/prepare_profile_background.sh ~/Downloads/licensed-vcg-background.jpg
   ```

3. Preview the site locally or wait for GitHub Pages after push.
4. Verify:

   ```bash
   npx --yes sass --no-source-map _sass/layout/_profile-home.scss /tmp/profile-home.css
   git diff --check
   ```

5. Commit `images/profile-bg-medtech.jpg` only after confirming the source image is licensed.

