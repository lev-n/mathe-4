# Security policy

Mathe 4 is a static web app for children. It has no server code, no accounts and no cookies. Progress is stored only in the browser's `localStorage`, and only after the child agrees.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub instead: open the repository's **Security** tab and choose **Report a vulnerability**.

Please include the steps to reproduce, the affected page or file, and the browser you used. You will get an answer as soon as possible. Please give us reasonable time to fix the issue before you disclose it.

## In scope

- The code in this repository and the live site https://mathe-4.web.app.
- Cross-site scripting or HTML injection, for example through an imported progress file.
- Weaknesses in the Content Security Policy or the other security headers in `firebase.json`.
- Anything that sends data to a third party, or writes to storage before the child has agreed.

## Supported versions

Only the latest version on the `main` branch receives fixes.
