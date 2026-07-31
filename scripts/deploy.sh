#!/usr/bin/env bash
# GitHub Actions 없이 수동으로 dist/를 gh-pages 브랜치에 배포하는 스크립트.
# 사용법: npm run build 실행 후 -> bash scripts/deploy.sh
set -euo pipefail

if [ ! -d "dist" ]; then
  echo "dist 폴더가 없습니다. 먼저 'npm run build'를 실행하세요."
  exit 1
fi

git rev-parse --is-inside-work-tree > /dev/null 2>&1 || { echo "git 저장소가 아닙니다."; exit 1; }

WORKTREE_DIR=".gh-pages-worktree"
rm -rf "$WORKTREE_DIR"

if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WORKTREE_DIR" gh-pages
else
  git worktree add --orphan -b gh-pages "$WORKTREE_DIR"
fi

rm -rf "$WORKTREE_DIR"/*
cp -r dist/. "$WORKTREE_DIR"/
touch "$WORKTREE_DIR/.nojekyll"

cd "$WORKTREE_DIR"
git add -A
git commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)" --allow-empty
git push origin gh-pages

cd ..
git worktree remove "$WORKTREE_DIR" --force
echo "GitHub Pages 배포 완료 (gh-pages 브랜치)"
