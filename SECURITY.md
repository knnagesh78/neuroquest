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
- Firebase Storage is closed until explicit per-user upload rules are added.
- Never commit `.env.local`, service-account JSON files, private keys, or
  passwords. Use GitHub and Vercel environment settings for deployment config.
