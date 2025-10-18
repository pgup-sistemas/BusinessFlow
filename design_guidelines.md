# Design Guidelines: AI Vibe Code - Multi-Tenant Review Management SaaS

## Design Approach

**Selected Framework:** Modern SaaS Dashboard System (inspired by Linear, Vercel, and Shadcn UI principles)

**Rationale:** This enterprise-grade multi-tenant platform requires a utility-focused approach prioritizing data clarity, workflow efficiency, and professional polish. The design emphasizes information hierarchy, quick decision-making, and seamless operation across complex management tasks.

**Core Principles:**
- **Data Clarity First:** Every metric, table, and status must be instantly scannable
- **Workflow Efficiency:** Minimize clicks between detection → moderation → publication
- **Professional Authority:** Convey enterprise-grade reliability and trustworthiness
- **Scalable Complexity:** Support single user to multi-company enterprise operations

---

## Color Palette

### Light Mode
**Primary Brand:** 
- Main: 263 70% 50% (deep purple-blue for primary actions, navigation)
- Hover: 263 70% 45%
- Subtle: 263 70% 95% (backgrounds for selected states)

**Semantic Colors:**
- Success: 142 71% 45% (approved responses, published status)
- Warning: 38 92% 50% (pending moderation, requires attention)
- Danger: 0 84% 60% (blocked content, critical reviews 1-2 stars)
- Info: 221 83% 53% (neutral notifications, general info)

**Neutrals:**
- Background: 0 0% 100%
- Surface: 240 5% 96%
- Border: 240 6% 90%
- Text Primary: 240 10% 4%
- Text Secondary: 240 5% 45%
- Text Muted: 240 4% 65%

### Dark Mode
**Primary Brand:**
- Main: 263 70% 60%
- Hover: 263 70% 65%
- Subtle: 263 45% 15%

**Semantic Colors:**
- Success: 142 71% 50%
- Warning: 38 92% 55%
- Danger: 0 84% 65%
- Info: 221 83% 58%

**Neutrals:**
- Background: 240 10% 4%
- Surface: 240 5% 8%
- Border: 240 4% 16%
- Text Primary: 0 0% 98%
- Text Secondary: 240 5% 65%
- Text Muted: 240 4% 45%

---

## Typography

**Font Family:**
- Primary: 'Inter', system-ui, sans-serif (body text, UI elements)
- Monospace: 'JetBrains Mono', 'Fira Code', monospace (review IDs, API keys, JSON data)

**Type Scale:**
- Display (Dashboards): text-4xl (36px), font-bold, tracking-tight
- Heading 1 (Page Titles): text-3xl (30px), font-semibold
- Heading 2 (Section Headers): text-2xl (24px), font-semibold
- Heading 3 (Card Titles): text-lg (18px), font-medium
- Body Large (Primary Content): text-base (16px), font-normal
- Body (Default): text-sm (14px), font-normal
- Caption (Metadata): text-xs (12px), font-normal, text-muted

---

## Layout System

**Spacing Units:** Consistent use of 4, 8, 12, 16, 24, 32, 48 (p-1, p-2, p-3, p-4, p-6, p-8, p-12)

**Container Strategy:**
- Dashboard Shell: Full viewport with fixed sidebar (w-64) + main content area
- Content Max-Width: max-w-7xl for primary content areas
- Card Padding: p-6 (standard), p-8 (feature cards)
- Section Spacing: space-y-6 (between cards), space-y-8 (between major sections)

**Grid Systems:**
- Metrics Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 (KPI cards)
- Review Queue: Single column with dense row items
- Template Management: grid-cols-1 lg:grid-cols-2 (template cards)
- Analytics Charts: grid-cols-1 lg:grid-cols-2

---

## Component Library

### Navigation
**Sidebar Navigation:**
- Fixed left sidebar, dark surface background
- Active state: primary brand color with subtle background (primary/10 opacity)
- Icons: 20px Lucide icons with text-sm labels
- Sections: Dashboard, Reviews, Templates, Companies, Analytics, Settings
- Company switcher at top with dropdown

**Top Bar:**
- Company context indicator
- Real-time sync status badge
- Notification bell with unread count
- User avatar with role badge (Admin/Moderator/Viewer)

### Data Display
**KPI Cards:**
- White/surface background with subtle border
- Large number display (text-3xl font-bold)
- Trend indicator (↑↓ with percentage in success/danger colors)
- Supporting label in text-muted
- Compact: h-28, spacing optimized for scanability

**Review Cards:**
- Structured layout: Star rating (large, colored) + Author + Date on header
- Review text: text-sm in card body, max 3 lines with "Show more"
- Status badge: pill-shaped, semantic colors (Pending/Approved/Blocked/Published)
- Priority indicator: left border (4px) in urgent/high/normal/low colors
- Action buttons: bottom-right, ghost variants

**Tables:**
- Striped rows for alternating backgrounds (bg-surface every other row)
- Sticky header with border-b-2
- Sortable columns with sort indicators
- Row hover state: subtle background lift
- Compact row height: py-3
- Action column: right-aligned with icon buttons

### Forms & Inputs
**Template Editor:**
- Split view: Template config (left 40%) + Preview (right 60%)
- Monaco-style code editor for template body with syntax highlighting for {{placeholders}}
- Inline validation with real-time placeholder preview
- Tone selector: segmented control (Positive/Neutral/Empathetic/Recovery)
- Star range: dual-thumb slider visualization
- Keywords: tag input with chip display

**Moderation Interface:**
- Original review in card (read-only, shaded background)
- Generated response in editable textarea with character count
- Flag badges displayed prominently with icon + label
- Action buttons: Approve (success), Edit (warning), Reject (danger), all large size

### Status & Feedback
**Badges:**
- Rating stars: Filled yellow stars (★) for visual scanning
- Status pills: px-3 py-1 rounded-full, semantic colors with 10% opacity backgrounds
- Priority tags: Uppercase text-xs font-semibold with left-accent border

**Toast Notifications:**
- Bottom-right positioning
- 4-second auto-dismiss
- Icon + Message + Optional Action
- Success/Warning/Error variants

**Loading States:**
- Skeleton loaders for cards and tables (shimmer animation)
- Inline spinners for button actions
- Progress bars for batch operations

### Analytics
**Charts:**
- Chart.js with custom color scheme matching brand palette
- Line charts: smooth curves, gradient fills (primary color with opacity)
- Bar charts: rounded corners, subtle shadows
- Pie/Donut: semantic colors for status distribution
- Grid backgrounds in border-color, subtle

---

## Interactions & Microanimations

**Transitions:** Use sparingly, focus on utility
- Card hover: subtle lift with shadow (transition-shadow duration-200)
- Button press: scale-95 on active
- Modal entry: fade + slide-up (duration-200)
- Page transitions: None (instant navigation for speed)

**Focus States:**
- Ring-2 ring-primary ring-offset-2 for keyboard navigation
- High contrast for accessibility

---

## Unique Dashboard Features

**Real-Time Indicators:**
- Pulsing dot animation for "Syncing now" status
- Live counter updates for pending queue without page refresh
- WebSocket connection status badge

**Bulk Actions Bar:**
- Appears when table rows selected (sticky bottom)
- Shows count + actions (Approve All, Assign Template, Export)
- Dismiss with ESC or deselect

**Quick Actions Palette:**
- Cmd+K search overlay
- Jump to: Review by ID, Company, Template
- Execute: Sync Now, Create Template, View Analytics

---

## Page-Specific Layouts

### Dashboard (Home)
- Top: 4 KPI cards (grid-cols-4)
- Middle: Recent reviews table + Priority queue side-by-side
- Bottom: Weekly performance chart (full-width)

### Review Queue
- Filter bar: Status, Priority, Date range, Company (if multi-tenant view)
- List view with infinite scroll
- Detail panel slides in from right on row click

### Template Management
- Grid of template cards (grid-cols-2)
- Each card: Name, tone badge, usage stats, last used timestamp
- Click opens full editor modal

### Analytics
- Date range selector (top-right)
- 2x2 grid of charts: Response time trend, Rating distribution, Template performance, Moderation funnel
- Export to CSV button

### Company Settings
- Tab navigation: Profile, Google Connections, Users, Billing
- OAuth connection cards with status and re-auth button
- User table with role management inline editing

---

## Accessibility & Quality Standards

- WCAG 2.1 AA compliance minimum
- All interactive elements keyboard accessible
- Color contrast ratios: 4.5:1 (text), 3:1 (UI components)
- Semantic HTML throughout
- ARIA labels for icon-only buttons
- Form validation with clear error messages
- Screen reader announcements for status changes