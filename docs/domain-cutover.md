# floridanomics.com cutover plan

Goal: point floridanomics.com at the new dashboard (GitHub Pages).
Old 2012 site is archived at `~/code/_archive/floridanomics-2012-site-20260610/`.

## Step 1: GoDaddy (Haydee / mom's account) — ~5 minutes

**First, regardless of anything else: confirm AUTO-RENEW is ON for
floridanomics.com. It expires September 26, 2026.**

The domain currently uses outside nameservers (NS1/NS2.LUNARIFFIC.COM,
legacy Lunarpages hosting). In GoDaddy:

1. My Products → floridanomics.com → DNS / Manage DNS.
2. If it says "We can't display your DNS because you're using custom
   nameservers": click "Change Nameservers" and choose
   **"GoDaddy nameservers (recommended)"**. Save.
3. Once GoDaddy DNS is active, delete any existing A / CNAME records for
   `@` and `www`, then add:

   | Type  | Name | Value                   |
   |-------|------|-------------------------|
   | A     | @    | 185.199.108.153         |
   | A     | @    | 185.199.109.153         |
   | A     | @    | 185.199.110.153         |
   | A     | @    | 185.199.111.153         |
   | CNAME | www  | tonyv2289.github.io     |

Note: switching nameservers away from Lunarpages will also drop any old
email/MX records hosted there. info@floridanomics.com on the old host will
stop working (it may already be dead; the site backend returns errors).
If that mailbox matters, check it before switching.

## Step 2: Repo flip (TJ / Claude) — after DNS is set

1. Merge the prepared `domain/floridanomics-com` branch (Vite base "/",
   canonical + OG URLs updated to https://www.floridanomics.com/).
2. Set the custom domain on GitHub Pages:
   `gh api -X PUT repos/tonyv2289/floridanomics-dashboard-mvp/pages -f cname=www.floridanomics.com`
3. Wait for the certificate, then enforce HTTPS:
   `gh api -X PUT repos/tonyv2289/floridanomics-dashboard-mvp/pages -F https_enforced=true`
4. Verify https://www.floridanomics.com/ and https://floridanomics.com/
   (apex redirects to www), and that
   https://tonyv2289.github.io/floridanomics-dashboard-mvp/ redirects.

DNS propagation can take minutes to a few hours. The GitHub Pages
certificate usually issues within an hour of DNS resolving.
