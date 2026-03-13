# Frontend Complete Refactor Plan

## Objective
Rebuild the frontend of the Nodal application to provide an elegant, Memos-like experience. The new architecture will strictly use `shadcn/ui` components via its CLI, establish a responsive sidebar layout, implement robust React Query encapsulation, and deliver comprehensive memo features (markdown, images, search, and CRUD actions).

## Implementation Steps

### 1. Initialize & Install UI Components
- Run the `shadcn@latest` CLI to install all required UI components without handwriting them.
- Required components: `sidebar`, `form`, `input`, `button`, `label`, `dialog`, `dropdown-menu`, `sonner`, `avatar`, `scroll-area`, `separator`, `skeleton`, `textarea`, `tabs`, `switch`, `tooltip`.

### 2. React Query Encapsulation
- Create `app/hooks/queries` to house data fetching logic.
- Create `app/hooks/mutations` to house data modification logic.

### 3. Layout & Routing Redesign
- **Routing** (`app/routes.ts`): Setup layout wrapping authenticated routes, leaving `/login` standalone.
- **Main Layout** (`app/routes/layout.tsx`): Implement `shadcn/ui` `SidebarProvider` and `Sidebar` for responsive navigation.
- **Login/Register** (`app/routes/login.tsx`): Use `Tabs` to toggle between Login and Registration, leveraging `Form` for validation.

### 4. Timeline & Memo Features
- **Home Page** (`app/routes/home.tsx`): Implement the timeline feed.
- **Create Memo Editor**: Integrate a rich text input with image upload support.
- **Memo Component**:
  - Render Markdown using `react-markdown` and `remark-gfm`.
  - Display images using `yet-another-react-lightbox`.
  - Action Menu: A `DropdownMenu` offering Edit, Delete, Toggle Privacy, and Toggle Pin actions.
