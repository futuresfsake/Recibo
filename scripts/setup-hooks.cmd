@echo off
REM Point git at the repo's hooks (run once after cloning)
git config core.hooksPath .githooks
echo Hooks enabled: .githooks
