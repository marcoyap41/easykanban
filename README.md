# EasyKanban

A simple, customizable, and free Kanban task management web app with local data storage.

Open one page, start organizing. No account, no setup, no subscription. EasyKanban gives you a fast, good-looking board that you can make entirely your own.

**Live demo: [easykanba.vercel.app](https://easykanba.vercel.app)**

## Why EasyKanban

There is no shortage of Kanban tools. Most of them are built for teams, and they come with sign-ups, workspaces, onboarding, and a pricing page. If all you want is a quick place to keep track of your own tasks, that is a lot of overhead. EasyKanban was built for that gap.

**Simple by design**
EasyKanban is a single web page. There is no login to create, no email to confirm, and nothing to install. Open it and your board is ready. It is made for people who want quick, efficient access to a personal task board and nothing standing in the way.

**Yours to customize**
The main focus of EasyKanban is letting you shape the board to fit how you like to work and how you like it to look:
- Set your own wallpaper, cropped to the exact ratio of the board so it always fits.
- Choose a theme, and color-code stages and individual tasks.
- Switch between a column layout and horizontal lanes, and pick how many columns to show and how detailed the cards are.
- Turn on a frosted-glass header bar, and make stages and cards translucent so your wallpaper shows through, with sliders for both opacity and blur.

**Free, with nothing locked away**
Every customization option is available to everyone. There are no paid tiers, no premium backgrounds, and no features held back behind a subscription, which is a common pattern in other task management apps. What you see here is the full app.

**Your data stays with you**
Boards are stored locally in your browser, not on someone else's server. There is no account to be tied to, and you can export any board to JSON for backup or to move it elsewhere.

## Getting started

**Use it online:** open [easykanba.vercel.app](https://easykanba.vercel.app) and start right away.

**Run it locally:**
1. Download or clone this repository.
2. Open `index.html` in a modern browser.

That is all. The interface fonts load from Google Fonts; without an internet connection the app falls back to system fonts.

## Features

**Boards and stages**
- Multiple boards, with create, duplicate, reorder, and a trash to restore deleted boards.
- Customizable stages (add, rename, recolor, reorder, delete).
- Column layout or horizontal lane layout.

**Tasks**
- Title, notes, priority, difficulty (1 to 5), progress, and a color tag.
- Drag and drop between stages, with a live preview of where the card will land. Works with mouse, pen and touch.
- Search to find tasks quickly.

**Appearance**
- Light, Dusk and Dark themes.
- Three detail levels (Comfortable, Compact, Dense) and adjustable card size or columns shown.
- Custom wallpaper with a fixed-ratio crop (drag to position, scroll or slider to zoom).
- Blurry, semi-transparent header bar, plus translucent stages and cards, with adjustable opacity and separate blur for the header and stages. These options are in the Wallpaper dialog in the sidebar.

**Data**
- Manual save or optional autosave.
- Export a board to JSON and import it back, either replacing the current board or as a new one.
- Open tabs stay in sync with each other.

## Data storage

- Boards and settings are stored in the browser's `localStorage`.
- The wallpaper image is stored in `IndexedDB`, since it is too large for `localStorage`.
- Data lives in the browser on the device you use (and per site address, so the online version and a local copy do not share boards), so it does not sync between devices. Clearing site data removes your boards and wallpaper, so export important boards as JSON for backup.

## Project structure

```
index.html   Page structure and dialogs
style.css    Styles and themes
kanban.js    Application logic (boards, tasks, drag and drop, appearance)
favicon.svg  Icon
```

## Browser support

Any recent version of Chrome, Edge, Firefox or Safari. The blur effects rely on `backdrop-filter`.

## Credits

Original EasyKanban by Marco Christian.
