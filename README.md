# Course Chart Drill

A one-page quiz that looks like the paper course chart. Type the missing parts straight onto the sheet.

- **Class:** APUSH or AP World.
- **Rows:** quiz on the first N periods, or tick any set of rows. Rows not on the quiz stay printed.
- **Row by row** highlights one period at a time and moves on when it's done (click any row to jump to it). **Whole chart** lets you fill in anything in any order.
- **Check** marks answers right, wrong, or "check punctuation". Wrong answers stay editable.
- **Reveal:** the eye on any blank (or Alt+R) shows that one answer. **Give up** / **Reveal row** shows the rest.
- **Exact punctuation** (on by default) follows the handout's rule that punctuation and order matter. Capitals never count.
- **Accounts (optional):** type a username to make an account. No email or password. Finished quizzes, best score per class and unfinished quizzes are saved to a Google Sheet you own.

Open `index.html` in any browser. No build step and no dependencies apart from Google Fonts.

## Turning on accounts (about 5 minutes)

Accounts stay hidden until `API_URL` in `index.html` is set.

### 1. Make the Google Sheet

1. Go to [sheets.new](https://sheets.new) and name the sheet something like "Course Chart Drill".
2. Open **Extensions → Apps Script**.
3. Delete what's in `Code.gs`, paste in everything from [`google-sheet/Code.gs`](google-sheet/Code.gs), and click **Save**.
4. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy**, then **Authorize access** and pick your Google account. Google warns that it "hasn't verified this app", because it's your own script. Click **Advanced → Go to (your project name)**, then **Allow**.
6. Copy the **Web app URL**. It ends in `/exec`.

The sheet makes three tabs the first time someone signs in: **Users**, **Results** and **Progress**. To get an Excel file: **File → Download → Microsoft Excel (.xlsx)**.

### 2. Put the URL in the site

In `index.html`, find this line and paste your URL between the quotes:

```js
const API_URL = "";
```

### 3. Host the site on GitHub Pages

The site has to be on a normal web host. The Claude artifact link blocks connections to Google, so accounts don't appear there.

1. In this repo on GitHub: **Settings → Pages**.
2. **Source:** Deploy from a branch. **Branch:** the branch with `index.html`, folder `/ (root)`. Click **Save**.
3. After a minute or two the site is at `https://willbykat3.github.io/chartkat/`.

### If you change `Code.gs` later

Saving the script isn't enough. Go to **Deploy → Manage deployments**, click the pencil, set **Version** to **New version**, and click **Deploy**. The URL stays the same.

## What accounts can and can't do

- A username is 2–24 letters or numbers (spaces, dots, dashes and underscores are fine after the first character). Capitals don't matter: "Jordan K" and "jordan k" are the same account.
- **There's no password.** Anyone who types a username can use that account and add results to it. That's fine for a study tool, not for anything private.
- The web app URL is visible in the page source, so someone determined could add junk rows to the sheet. If that happens, delete the rows, or make a new deployment and put the new URL in the site.
- Unfinished quizzes save about 2 seconds after each change. When you sign in on any device, the site offers to pick up where you left off.

## Chart data

The chart lives in the `COURSES` object near the top of the `<script>` in `index.html`.

- **APUSH** is transcribed from the *APUSH Course Chart 2026-2027* handout, including the themes page.
- **AP World** is transcribed from the class's AP World course chart. So far it has rows 1 and 2 (Post-Classical Era and Early Modern Era). Add more rows to the `eras` list when they come, and raise `version` if you change existing terms, so old unfinished quizzes aren't offered back.
