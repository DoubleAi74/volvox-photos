This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

Prompt for analysis:

Can you help me to understand some code in my next.js app. I will share the follwoing code files and I want you to help me by explaining what is going on. Also let me know if you see any redundancies.

The app has a dashboard and page components. The dashboard (DashViewClient.js with parent [usernameTag]/page.js) shows a number of cards linking to pages (shown by PageCard.js). Clicking on one takes the user to a page displayed with PageViewClient.js (with parent [usernameTag]/[pageSlug]/page.js) and this page shows a series of cards with images (PostCard.js). When switching between the dashboard and a page, there are two loading.js files which show a temporary screen with some of the dash and page metadata. And some of this data is handled by ThemeContext.js which you can see used in the overall layout.js file.

I will begin by sharing these code files with you in three batches, then I will ask you questions about how the code works.
This will be the structure of the batches:

Batch 1
PostCard.js
PageViewClient.js
[usernameTag]/[pageSlug]/page.js

Batch 2
PageCard.js
DashViewClient.js
[usernameTag]/page.js

Batch 3
[usernameTag]/loading.js
[usernameTag]/[pageSlug]/loading.js
ThemeContext.js
layout.js

Are you ready to recieve batch 1

...

Take some time to remember this and let me know when you are ready for batch 2

I will now confirm which of these features I want you to go ahead and implement. Then I will ask you to address them in batches.

For DashboardViewClient.js (from PageViewClient.js):

1. Loading Overlay System (Lines 658-736)
2. Improved Scroll Management (Lines 154-173)
3. Code Simplifications & Cleanups
4. Dev Overlay Toggle (Lines 595-602)

For DashboardInfoEditor.js (from PageInfoEditor.js):

1. Advanced Styling System (Lines 22-29)
2. Dual-Layer Text Display (Lines 92-134)
3. Better Loading State (Lines 90, 95-104)
4. Better Loading State (Lines 90, 95-104)
5. Invisible Placeholder Handling (Lines 86-88)
   6.Better Edit/View Toggle (Lines 85, 118-134)
6. Improved Textarea Styling (Lines 118-134)
7. Status Label Positioning (Lines 136-147)

Key Architectural Patterns to Adopt:

1. Optimistic Page Data from Context - PageViewClient uses themeState.optimisticPageData to show skeleton content immediately
2. Loading Overlay Pattern - Separate overlay that mirrors the real content structure
3. Sync-based Visibility - Content hidden until scroll position and data are ready
4. Grid-based Text Editor - Overlapping layers for smoother edit/view transitions
5. Comprehensive Status Tracking - Loading, syncing, uploading states all visible to user

git reset --hard HEAD
git clean -fd
