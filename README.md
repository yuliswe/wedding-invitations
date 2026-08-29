# Wedding Invitations

Yu & Jin's wedding invitation website, built with Next.js and deployed to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static export is written to `out/`.

## Deployment

Pushing to `release` triggers a GitHub Actions workflow that builds the site and deploys it to GitHub Pages.

## Assets

The SVG assets (`Chinese-Wedding-Symbol.svg`, `rose-floral-flourish.svg`, `deco-stamp.svg`) are checked in under `public/assets/`.

The following binary files need to be downloaded from the [Claude Design project](https://claude.ai/design/p/8aee9aa6-7a77-475a-83e1-f0a5e5e850f0) and placed in `public/assets/`:

**Story photos** (from the `assets/` directory in the design project):
- `photo-pei.jpeg`
- `photo-lighthouse.jpeg`
- `photo-closeup.jpeg`
- `photo-peace.jpeg`
- `photo-newyear.jpeg`
- `photo-bridge.jpeg`

**Gallery photos** (from the `assets/` directory):
- `g1.jpeg` through `g9.jpeg`

**Music** (from the `uploads/` directory, save as `public/assets/music.mp3`):
- `music.mp3`
