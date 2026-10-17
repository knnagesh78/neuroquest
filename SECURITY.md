# Security policy

## Reporting a vulnerability

Please do not report security issues in a public GitHub issue. Use GitHub's
private vulnerability reporting for this repository, or contact the repository
owner privately if that feature is unavailable. Include a clear description,
steps to reproduce, and the affected version. Do not include real student data
or live credentials in a report.

## Project security notes

- Firebase web configuration is public and is not a server credential.
- Firestore access is protected by `firestore.rules`; changes to those rules
  should be reviewed and tested before deployment.
- The app does not use Firebase Storage or private server credentials. Paid AI routes and provider integrations have been removed.
- Never commit `.env.local`, service-account JSON files, private keys, or
  passwords. Use GitHub and Vercel environment settings for deployment config.

## Dependency checks

The GitHub check runs a production dependency audit along with lint, unit tests,
Firebase emulator tests and a production build. Development tools are audited
separately: `braces` currently has an unpatched deeply nested pattern advisory
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)),
which affects the Firebase CLI and ESLint dependency chains. These packages are
not shipped as application runtime dependencies. Keep build and watch patterns
trusted, and update the tooling when a compatible patch is published. Do not use
`npm audit fix --force` to downgrade Next.js or the Firebase CLI across major
versions.
