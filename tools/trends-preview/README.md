# Trends Preview

Preview for the updated Trends page using `frontend/src/components/MyTrends copy.jsx` directly, with the preview app and mocks kept inside `tools/trends-preview`.

## Quick start

From the repo root:

```powershell
cd tools/trends-preview
npm.cmd run dev
```

Then open:

```text
http://localhost:4174
```

## What it includes

- Renders from `MyTrends copy.jsx` rather than a separate mock UI
- Tool-local mock `useAuth` data
- Tool-local mock trend history
- The same range filters and chart interactions from the component
