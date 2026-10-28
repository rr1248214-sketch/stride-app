#!/usr/bin/env bash
# Publish Stride to GitHub Pages.
#
# Run this from inside the stride-app folder:
#     bash push-to-github.sh
#
# It asks for your username and repo name, then runs `git push`.
# Git itself will ask for your password — paste your Personal Access Token
# THERE, at git's own prompt. The token is never stored in this file, never
# written to the repository, and never sent to anyone but GitHub.

set -e

if [ ! -f "index.html" ]; then
    echo "Run this from inside the stride-app folder (index.html not found here)."
    exit 1
fi

read -r -p "Your GitHub username: " GHUSER
if [ -z "$GHUSER" ]; then echo "Username is required."; exit 1; fi

read -r -p "Repository name [stride-app]: " REPO
REPO=${REPO:-stride-app}

URL="https://github.com/$GHUSER/$REPO.git"
echo ""
echo "Before continuing, create an EMPTY repo named '$REPO' at:"
echo "    https://github.com/new"
echo "Choose Public, and do NOT add a README."
echo ""
read -r -p "Press Enter once the repository exists..."

git remote remove origin 2>/dev/null || true
git remote add origin "$URL"
git branch -M main

echo ""
echo "Pushing to $URL"
echo "When git asks for a password, paste your Personal Access Token."
echo ""

git push -u origin main

echo ""
echo "Done. Now enable Pages:"
echo "  https://github.com/$GHUSER/$REPO/settings/pages"
echo "  Branch: main   Folder: / (root)   then Save."
echo ""
echo "Your site will be live in about a minute at:"
echo "  https://$GHUSER.github.io/$REPO/"
