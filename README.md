# Fueled by Chaos & Coffee ☕

My personal blog — making sense of AI, work, and everything breaking in between.

**Live site:** [jrweigel.github.io](https://jrweigel.github.io)

Built with [Docusaurus](https://docusaurus.io/) and deployed automatically via GitHub Pages.

## Writing a New Blog Post

1. Create a new `.mdx` file in the `blog/` folder using this naming pattern:

   ```
   blog/YYYY-MM-DD-my-post-slug.mdx
   ```

2. Add frontmatter at the top of the file:

   ```mdx
   ---
   slug: my-post-slug
   title: My Post Title
   authors: [jrweigel]
   tags: [topic1, topic2]
   ---
   ```

3. Write your content in markdown below the frontmatter. Use `{/* truncate */}` on its own line to control where the preview cuts off on the blog index:

   ```mdx
   ---
   slug: my-post-slug
   title: My Post Title
   authors: [jrweigel]
   tags: [topic1, topic2]
   ---

   This part shows as the preview on the blog index page.

   {/* truncate */}

   Everything below here only appears when you click into the full post.
   ```

4. Commit and push to `master` — the site auto-deploys in ~1-2 minutes.

## Local Development

```bash
npm install   # first time only
npm start     # starts dev server at http://localhost:3000
```

## Project Structure

```
blog/              # Blog posts go here
  authors.yml      # Author profiles
src/
  css/custom.css   # Theme colors
  pages/index.js   # Homepage
docusaurus.config.js  # Site config (title, navbar, footer)
.github/workflows/    # Auto-deploy on push to master
```

## Tips

- Files are `.mdx` (MDX) — you get full markdown plus JSX support if needed
- Images can go in a folder next to your post: `blog/YYYY-MM-DD-my-post/index.mdx` + `blog/YYYY-MM-DD-my-post/image.png`
- The `tags` in frontmatter auto-generate tag pages on the site
- Dark mode is enabled and respects the reader's system preference

## Drafts

Add `draft: true` to the frontmatter to keep a post out of the production build. It will still show up in local dev (`npm start`) so you can preview it.

```mdx
---
slug: work-in-progress
title: Not Ready Yet
authors: [jrweigel]
tags: [draft]
draft: true
---
```

Remove `draft: true` (or set it to `false`) and push to publish.

## Editing from GitHub.com

You don't need a local setup to write posts. Navigate to the `blog/` folder on GitHub, click **Add file > Create new file**, write your post, and commit. The site auto-deploys.

## Troubleshooting

- **Build failed?** Check the **Actions** tab on the repo for error logs.
- **MDX syntax error?** The most common issue — use `{/* comment */}` instead of `<!-- comment -->` in `.mdx` files.
- **Post not showing?** Make sure the file is in `blog/`, uses the `YYYY-MM-DD-slug.mdx` naming pattern, and doesn't have `draft: true`.
- **Styles look wrong locally?** Try stopping the dev server and running `npm start` again.

## Extras You Can Add Later

- **Custom domain** — Buy a domain, add a `CNAME` file to `static/`, and configure in repo Settings > Pages
- **Search** — Docusaurus supports local search plugins (e.g., `docusaurus-lunr-search`)
- **Analytics** — Add Google Analytics or Plausible via `docusaurus.config.js`
- **Social card** — Replace `static/img/docusaurus-social-card.jpg` to customize link preview images
- **RSS** — Already enabled! Readers can subscribe at `/blog/rss.xml` and `/blog/atom.xml`
