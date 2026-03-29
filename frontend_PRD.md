# Frontend Product Requirements Document (PRD)

## 1. Product Overview
**Name**: Wallmind Frontend
**Purpose**: A web application for users to submit structural floor plans, have them analyzed by an AI pipeline, and view the extracted reports, structural flags, and 3D scenes (Three.js/GLTF).

## 2. Target Audience
Architects, civil engineers, real estate developers, and homeowners who need rapid programmatic analysis and 3D visualizations of 2D floor plans.

## 3. Core Features & Capabilities

### 3.1 Authentication & User Management
* **Sign Up**: Users can register with a `username`, `email`, and `password`. They are required to verify their email address before logging in.
* **Email Verification**: Dedicated flow/page to handle the `/verify-email?token=...` link sent to their mailbox.
* **Login/Logout**: Secure cookie-based session management. The dashboard should protect against unauthorized access.
* **User Profile**: Display `username`, `avatar`, and `totalProjects` based on user login API responses.

### 3.2 Floor Plan Analysis (The Core Loop)
* **Upload Interface**: A drag-and-drop or file selection form accepting image uploads (field: `floor_plan`).
* **Processing State**: Visual indicators (loaders, spinners) while the backend parses the floor plan (calling `POST /api/v1/analysis`).
* **Instant Results Viewing**: Upon successful upload, seamlessly transition to the result view displaying the parsed structured `report`.

### 3.3 Dashboard (Analyses Management)
* **List View**: A page retrieving all past analyses (`GET /api/v1/analysis`).
* **Status Tracking**: Show current status (`processing`, `completed`, `failed`) and the upload date.
* **Thumbnail Previews**: Display original `imageUrl` associated with the analysis.

### 3.4 Detailed Analysis Viewer
* **2D Overview**: Display the uploaded floor plan image alongside data (`report`).
* **Structural Flags list**: Display any structural anomalies or notices (`structuralFlags` array).
* **3D Visualization**: 
  * Utilize **Three.js** to parse and render `sceneJson`.
  * *OR* Provide a 3D viewer capable of rendering the `gltfUrl`.

---

## 4. Proposed Application Architecture & Tech Stack
* **Framework**: React (Next.js or Vite)
* **Styling**: Vanilla CSS or TailwindCSS with modern rich aesthetics (glassmorphism, skeleton loaders, modern typography).
* **3D Rendering**: `three.js` & `@react-three/fiber` (for rendering `sceneJson` and GLTF files).
* **Routing**: React Router or Next.js App Router for handling protected routes (Auth Guard).

## 5. View & Page Structure

1. **`/` (Landing Page)**: Call to action, features overview.
2. **`/login` & `/signup`**: Auth handling.
3. **`/verify-email`**: Handles successful/failed token redemption.
4. **`/dashboard` (Protected)**: Main user area listing all analyses.
5. **`/upload` (Protected)**: Form with file `Multipart/form-data` support.
6. **`/analysis/:id` (Protected)**: Complex viewer with split screen (2D Image + Data/Flags | 3D Render).

---

## 6. Backend API Integration Mapping

### Auth Endpoints (`/api/v1/auth`)
- `POST /signup` ➔ `{ email, password, username }`
- `POST /login` ➔ `{ email, password }`
- `POST /logout` ➔ Clears authentication cookie
- `GET /verify-email?token=...` ➔ Confirms user registration

### Analysis Endpoints (`/api/v1/analysis`)
- `POST /` ➔ FormData: `floor_plan` (File). Returns `{ success, report }`.
- `GET /` ➔ Returns `{ count, analyses: [...] }`.
- `GET /:id` ➔ Returns `{ success, analysis }`.

*Note: As `credentials: true` is configured on the backend, the frontend must include credentials in all axios/fetch calls for cookie transmission.*

## 7. Open Questions / Next Steps
- What specific design system/color palette should we adopt? (e.g. Dark mode default?)
- Do we have sample `sceneJson` payloads to mock the 3D viewer development?
- Are there specific file format restrictions (e.g., `.png`, `.jpg`, `.pdf`) for the floor plan upload that we should enforce on the frontend?
