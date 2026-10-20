# HUB Web

React + TypeScript web application, built with Vite.

## Local development

Requirements: Node.js 24 LTS and npm.

```powershell
cd D:\Projects\hub-frontend
npm ci
npm run dev
```

Open the local URL printed by Vite. Stop the server with Ctrl+C.

## Checks and build

```powershell
npm run lint
npm run build
```

The build command runs TypeScript checks and creates the production files in `dist/`.
Use `npm run preview` to inspect the production build locally.

## Project boundaries

- `hub-frontend`: React web application (this project).
- `hub-app`: Expo/React Native mobile application.
- `hub-backend`: ASP.NET Core REST API.
- `HUB-Documentation`: master requirements and design documentation.

This is the initial Vite starter. HUB features and backend integration are not implemented yet.
The web application will call the backend API; database credentials and payment secrets must remain on the backend.

## Source files

- `src/App.tsx`: starter screen.
- `src/main.tsx`: React entry point.
- `src/`: application code and styles.
- `public/`: static assets.
