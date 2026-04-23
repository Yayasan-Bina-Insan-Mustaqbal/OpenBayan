# Dashboard Todo Selection

## Priority 1: Functional Workspace Shell

- [x] **Account Avatar**
    - [x] Dashboard header uses a right-side account trigger instead of a standalone theme toggle.
    - [x] Avatar shows the authenticated user image when available.
    - [x] Avatar falls back to initials from the user name or email.
    - [x] Avatar trigger has subtle hover, active press, and open-state scale animation.
- [x] **Account Menu**
    - [x] Menu opens from the account avatar/name trigger.
    - [x] Menu shows account identity summary: avatar, display name, and email.
    - [x] Theme toggle lives inside the account menu.
    - [x] Account/settings entry is reserved for the future profile/settings screen.
    - [x] Dropdown opens with fade, zoom, and slight slide animation.
- [x] **Sign Out Button**
    - [x] Sign out action lives inside the account menu.
    - [x] Uses NextAuth client sign out and returns the user to the home page.
- [ ] **User Profile Summary**
- [ ] **Theme Toggle**
- [ ] **Settings Entry**
- [ ] **Help And Feedback Entry**
- [ ] **Command Palette**
- [ ] **Global Search Bar**
- [ ] **Keyboard Shortcuts Foundation**
- [ ] **Notification Center**
- [ ] **Loading States**
- [ ] **Empty States**
- [ ] **Error States**
- [ ] **Responsive Mobile Shell**

## Priority 2: VS Code-Like Layout Foundation

- [ ] **Activity Bar**
- [ ] **Primary Sidebar**
    - [x] File explorer rows enter with a subtle staggered fade and slide.
    - [x] File and folder rows have gentle hover and active press feedback.
    - [x] Folder chevrons rotate smoothly when opened or closed.
    - [x] Nested folder contents expand and collapse with fade and height animation.
    - [x] File explorer selection opens the matching editor tab.
- [ ] **Sidebar Sections**
- [ ] **Sidebar Collapse And Resize**
- [x] **Editor Tabs**
    - [x] Uses shadcn Tabs as the first simple editor tab foundation.
    - [x] Open tabs are linked to file explorer selections.
- [x] **Active Tab State**
    - [x] Active tab updates when selecting either a tab or a file explorer item.
- [ ] **Tab Close And Reorder**
- [x] **Main Editor Area**
    - [x] Uses shadcn Resizable panels for a VS Code-like editor surface.
    - [x] Basic file content placeholder appears inside the selected tab.
- [x] **Right Inspector Panel**
    - [x] Right resizable panel shows active file metadata and placeholder research context.
- [x] **Bottom Panel**
    - [x] Bottom resizable panel shows active file status and placeholder logs/results.
- [ ] **Status Bar**
- [ ] **Breadcrumb Header**
- [ ] **Split Pane Foundation**
- [ ] **Persisted Layout State**

## Priority 3: OpenBayan Navigation

- [ ] **OpenBayan Sidebar Navigation**
- [ ] **Source Explorer**
- [ ] **Search Explorer**
- [ ] **Alamat Explorer**
- [ ] **Majmu Explorer**
- [ ] **Sahifah Explorer**
- [ ] **Recent Workspace Items**
- [ ] **Pinned Workspace Items**

## Priority 4: Workspace State And Data Boundaries

- [ ] **Workspace State Layer**
- [ ] **Auth Session State**
- [ ] **Active Workspace State**
- [ ] **Open Items State**
- [ ] **Selected Item State**
- [ ] **Storage Service Boundary**
- [ ] **Dashboard Authentication**

## Priority 5: Research Features

- [ ] **Search Workflow**
- [ ] **Source Result Display**
- [ ] **Connection Panel**
- [ ] **Alamat Workflow**
- [ ] **Majmu Workflow**
- [ ] **Sahifah Workflow**

## Priority 6: Verification

- [ ] **Docker Verification**
