**Windows Release Handoff**

- What I changed: added `electron-builder` and Windows build configuration to `package.json`, installed `electron-builder` as a dev dependency, and added a GitHub Actions workflow at `.github/workflows/build-windows.yml` to produce a native Windows release.
- Where to find changes: `package.json`, and `.github/workflows/build-windows.yml`.
- How to produce a Windows release (recommended):
  1. Push a Git tag to trigger the GitHub Actions workflow (build runs on `windows-latest` and uploads `dist/**` as an artifact):

```
git add package.json .github/workflows/build-windows.yml
git commit -m "chore: add windows build and CI workflow"
git push origin HEAD
git tag v1.0.0
git push origin v1.0.0
```

  2. Open the workflow run in GitHub Actions → click the run → download the `windows-release` artifact.

- How to build locally on Windows (alternative, simplest):
  - On a Windows machine or VM: `npm ci` then `npm run build`.
  - Requirements: Node.js (22 recommended), NSIS (installer) — the workflow installs NSIS via Chocolatey.

- How to attempt a local cross-build on Linux (less reliable):
  1. Install Wine and 32-bit support, and provide an X server (xvfb) so Wine tools that create/edit Windows resources can run.
 2. Example (may require sudo):

```
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install -y wine wine32 xvfb
xvfb-run -a npm run build
```

  - Caveats: Wine + xvfb can still fail for some rcedit/code-sign steps. CI (native Windows) is more reliable.

- Icon and signing:
  - I configured `icon.ico` in `package.json` build settings — add `icon.ico` at the repo root to use a custom icon. Without one, a default Electron icon is used.
  - Builds are unsigned by default. If you want an official signed installer, provide a code signing certificate and I can add secure upload/secret instructions for the workflow.

- Files added/modified:
  - `package.json` — `devDependencies` and `build` settings + `build` script
  - `.github/workflows/build-windows.yml` — CI workflow that builds on Windows and uploads `dist/**`

- Notes & recommended next steps:
  1. Use GitHub Actions (recommended) — it's native, reproducible, and avoids Wine fragility.
 2. Add `icon.ico` and, if desired, set up code signing credentials in GitHub Secrets and I will update the workflow to sign the installer.
 3. If you prefer local builds on Windows, I can provide a short checklist for preparing a Windows VM image with Node/NSIS installed.

If you want, I will commit the pending changes (they're already in the working tree) and push/tag for you, or I can prepare the signing workflow steps next. Which should I do? (Recommended default: trigger CI by creating a tag.)
