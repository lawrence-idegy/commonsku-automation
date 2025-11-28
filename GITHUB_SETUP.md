# GitHub Actions Setup Guide

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name it `commonsku-automation` (or any name you prefer)
3. Set it to **Private** (important - contains credentials)
4. Click "Create repository"

## Step 2: Push Your Code

Open a terminal in your project folder and run:

```bash
cd C:\Users\Lawrence\Downloads\CCC\commonsku-automation

git init
git add .
git commit -m "Initial commit - CommonSKU automation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/commonsku-automation.git
git push -u origin main
```

## Step 3: Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

### Secret 1: `COMMONSKU_URL`
```
https://idegy.commonsku.com
```

### Secret 2: `COMMONSKU_USERNAME`
```
antonietta@idegy.com
```

### Secret 3: `COMMONSKU_PASSWORD`
```
Dr3amt3am!
```

### Secret 4: `RCLONE_CONFIG`
Copy and paste this entire block:
```
[gdrive]
type = drive
client_id = 206902378223-c7e6fappfv3ql596d6bntlssic24vjbn.apps.googleusercontent.com
client_secret = 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
scope = drive
token = {"access_token":"ya29.a0ATi6K2sQjoayWkB4-jGmyUyWCCoFJv_e82aXosh_Eu2mWqUGcS4csnE45rWPHjSbCmQ6og_x8Bt8zao_i7QwbVoxmlkyPUWpZqBT3dsjRg9280A5dly-qljng04hxa30CTRr4tHk7xgPJZL6QQ5Mna90ab70bnFkMlwjwRwuwu15NvC-AXMQEww8G03sO-BxSYhC0r4aCgYKAdUSARASFQHGX2MiKu1ww4XnGwR0zvZBHXDfwA0206","token_type":"Bearer","refresh_token":"1//0edhIwjX7MW0ACgYIARAAGA4SNwF-L9IrE8eSqN2zeCxD0DzuFqBG6Ul7LUNT6BnBpID_dWh9DGfz6FlchVSVexG9K6txZ59FcdU","expiry":"2025-11-27T18:41:18.0542699-05:00","expires_in":3599}
team_drive =
```

## Step 4: Enable GitHub Actions

1. Go to your repo → **Actions** tab
2. You should see "CommonSKU Daily Reports" workflow
3. Click **Enable workflow** if prompted

## Step 5: Test It

### Manual Test Run:
1. Go to **Actions** → **CommonSKU Daily Reports**
2. Click **Run workflow** (dropdown on right)
3. Select report type (e.g., `daily`)
4. Click **Run workflow**

### View Results:
- Check the workflow run for logs
- Download artifacts (reports & logs) from the run summary

## Schedule

The workflow runs automatically at:
- **5:00 PM EST (10:00 PM UTC)** on **Monday through Friday**

Based on the day:
| Day | Reports Generated |
|-----|-------------------|
| Mon, Tue, Thu | Daily (Today) → Current Data folder |
| Wednesday | Daily + This Month + Last Month → Current + Previous |
| Friday | All periods (18 reports) → Current + Previous |

## Troubleshooting

### Token Expired
If Google Drive uploads fail after ~1 week, the refresh token should auto-renew. If not:
1. Run `rclone config reconnect gdrive:` locally
2. Update the `RCLONE_CONFIG` secret with the new token

### Workflow Not Running
- Check **Actions** tab for errors
- Verify all 4 secrets are set correctly
- Make sure Actions are enabled for the repo

### View Logs
Each run saves logs as artifacts. Download from the workflow run page.
