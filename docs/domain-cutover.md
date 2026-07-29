# floridanomics.com cutover plan

Goal: point floridanomics.com at the new dashboard (GitHub Pages).
Old 2012 site is archived at `~/code/_archive/floridanomics-2012-site-20260610/`.

## Step 1: GoDaddy renewal check

**First, regardless of anything else: confirm AUTO-RENEW is ON for
floridanomics.com. It expires September 26, 2026.**

The domain is registered at GoDaddy. Confirm auto-renew is enabled, but do not
change nameservers during the web cutover.

## Step 2: HostPapa DNS

As verified July 29, 2026, authoritative DNS is `ns1.hostpapa.com` and
`ns2.hostpapa.com`. Keep those nameservers so the existing mailbox remains
undisturbed. In HostPapa DNS, change only the website records:

   | Type  | Name | Value                   |
   |-------|------|-------------------------|
   | A     | @    | 185.199.108.153         |
   | A     | @    | 185.199.109.153         |
   | A     | @    | 185.199.110.153         |
   | A     | @    | 185.199.111.153         |
   | CNAME | www  | tonyv2289.github.io     |

Do not delete or alter the current mail records:

- `MX @ -> mail.floridanomics.com` (priority 10)
- `A mail -> 216.222.196.82`
- the existing SPF TXT record

Current web records before cutover are `A @ -> 216.222.196.82` and
`CNAME www -> floridanomics.com`.

## Step 3: Repo flip — after DNS is set

1. Set repository variables `VITE_BASE_PATH=/` and
   `VITE_PUBLIC_URL=https://www.floridanomics.com/`.
2. Set the custom domain on GitHub Pages:
   `gh api -X PUT repos/tonyv2289/floridanomics-dashboard-mvp/pages -f cname=www.floridanomics.com`
3. Wait for the certificate, then enforce HTTPS:
   `gh api -X PUT repos/tonyv2289/floridanomics-dashboard-mvp/pages -F https_enforced=true`
4. Verify https://www.floridanomics.com/ and https://floridanomics.com/
   (apex redirects to www), and that
   https://tonyv2289.github.io/floridanomics-dashboard-mvp/ redirects.

DNS propagation can take minutes to a few hours. The GitHub Pages
certificate usually issues within an hour of DNS resolving.
