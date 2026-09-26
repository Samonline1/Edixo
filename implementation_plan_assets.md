## Implementation Plan: Asset Vault App

1.  **Define Types (`src/types.ts`)**: Add types for `Asset` and `AssetTag`.
2.  **Create App Route (`src/App.tsx` & `src/pages/Home.tsx`)**: Wire up the navigation and routing for the third app.
3.  **Build Asset Manager Component (`src/pages/AssetManager.tsx`)**:
    *   **State Management:** Local storage hooks for `assets` and `assetTags`.
    *   **Main Dashboard:** Display folders (tags) in a grid.
    *   **Folder View:** When a folder is clicked, display assets inside it with top-bar filters (All, Video, Image, Article).
    *   **Add Asset Modal:** Multi-step or dynamic form.
        *   Select Asset Type (Video, Image, Article).
        *   Input URL and Title.
        *   If Video: Input start/end time.
        *   Select/Create Tag (Folder).
    *   **Preview Modal:** Click an asset to view it in a full-screen popup (YouTube player, Image viewer, or Iframe).
4.  **Refinement:** Add styles matching `ClipEditor` and `VideoManager`.
