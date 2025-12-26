# Visual Mockups - Notification Refactoring

## Before and After Comparison

### AuthenticatedLayout Header

#### BEFORE:
```
┌───────────────────────────────────────────────────────────────┐
│ [🛡️ Cert Lab]  [Dashboard] [Study Timer] [Marketplace] ...   │
│                                                                │
│                               Level 5 ████▒▒▒▒ 10d  [🔔•] [TU] │
│                                              ↑ Bell  ↑ Avatar │
└───────────────────────────────────────────────────────────────┘
```

- Separate notification bell button (blue/primary colored)
- Small red dot on bell when notifications exist
- User avatar separate from notifications

#### AFTER:
```
┌───────────────────────────────────────────────────────────────┐
│ [🛡️ Cert Lab]  [Dashboard] [Study Timer] [Marketplace] ...   │
│                                                                │
│                               Level 5 ████▒▒▒▒ 10d       [(TU)]│
│                                                           ↑    │
│                                              Avatar with ring  │
└───────────────────────────────────────────────────────────────┘
```

- No separate notification bell button
- User avatar has RED RING around it when notifications exist
- Single unified button for both user menu and notifications

#### Red Ring Detail (when notifications exist):
```
Normal Avatar (No Notifications):
     ┌─────┐
     │ T U │  ← Simple avatar with border
     └─────┘

Avatar with Notifications:
   ┌─┌─────┐─┐
   │ │ T U │ │  ← Red ring (2px) around avatar
   └─└─────┘─┘
     ^^^
   Red Ring
```

### Header Component Dropdown

#### BEFORE:
```
User clicks avatar icon in main navigation:

┌─────────────────────────────────┐
│ ┌───┐                           │
│ │TU │  Test User                │
│ └───┘  Certification Student    │
├─────────────────────────────────┤
│ Token Balance:                  │
│ 🪙 100 available tokens         │
│ 1 token per question            │
├─────────────────────────────────┤
│ 🏆 My Achievements              │
│ 👤 My Profile                   │
├─────────────────────────────────┤
│ 🚪 Sign Out                     │
└─────────────────────────────────┘
```

#### AFTER (with notifications):
```
User clicks avatar icon in main navigation:

┌─────────────────────────────────┐
│ ┌─┌───┐─┐                       │  ← Red ring visible
│ │ │TU │ │  Test User            │     in dropdown header
│ └─└───┘─┘  Certification Student│
├─────────────────────────────────┤
│ Token Balance:                  │
│ 🪙 100 available tokens         │
│ 1 token per question            │
├─────────────────────────────────┤
│ Notifications              [3]  │  ← NEW SECTION
│ You have 3 new achievements!    │
│ ┌─────────────────────────────┐ │
│ │ 🔔 View All Notifications   │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 🏆 My Achievements              │
│ 👤 My Profile                   │
├─────────────────────────────────┤
│ 🚪 Sign Out                     │
└─────────────────────────────────┘
```

#### AFTER (without notifications):
```
User clicks avatar icon in main navigation:

┌─────────────────────────────────┐
│ ┌───┐                           │  ← No red ring
│ │TU │  Test User                │
│ └───┘  Certification Student    │
├─────────────────────────────────┤
│ Token Balance:                  │
│ 🪙 100 available tokens         │
│ 1 token per question            │
├─────────────────────────────────┤
│ 🏆 My Achievements              │  ← No notifications section
│ 👤 My Profile                   │
├─────────────────────────────────┤
│ 🚪 Sign Out                     │
└─────────────────────────────────┘
```

## Interaction Flows

### Flow 1: User Has New Notifications

**AuthenticatedLayout (Compact Header):**
```
1. Page Load
   ┌───────────────────────┐
   │  [(TU)]              │  ← Red ring visible
   └───────────────────────┘
         ↓
   User hovers
         ↓
   ┌─────────────────────┐
   │ Tooltip:            │
   │ "3 new              │
   │  notifications"     │
   └─────────────────────┘
         ↓
   User clicks
         ↓
   ┌─────────────────────┐
   │ Notifications       │
   │ Panel Slides In     │
   │ from Right →        │
   │                     │
   │ [Notification 1]    │
   │ [Notification 2]    │
   │ [Notification 3]    │
   └─────────────────────┘
```

**Header (Main Navigation):**
```
1. Page Load
   ┌─────────────────────┐
   │ [(TU)] Test User ▼ │  ← Red ring visible in trigger
   └─────────────────────┘
         ↓
   User clicks
         ↓
   ┌─────────────────────────┐
   │ ┌─┌───┐─┐ Test User     │
   │ │ │TU │ │               │
   │ └─└───┘─┘               │
   ├─────────────────────────┤
   │ Notifications      [3]  │
   │ You have 3 new          │
   │ achievements!           │
   │ [View All Notifs]       │
   ├─────────────────────────┤
   │ 🏆 My Achievements      │
   │ 👤 My Profile           │
   └─────────────────────────┘
```

### Flow 2: User Has No Notifications

**AuthenticatedLayout:**
```
1. Page Load
   ┌───────────────────────┐
   │  [TU]                │  ← No red ring
   └───────────────────────┘
         ↓
   User hovers
         ↓
   ┌─────────────────────┐
   │ Tooltip:            │
   │ "User menu"         │
   └─────────────────────┘
         ↓
   User clicks
         ↓
   ┌─────────────────────┐
   │ User Panel          │
   │ Slides In           │
   │ from Right →        │
   │                     │
   │ Profile Info        │
   │ Theme Settings      │
   │ Sign Out            │
   └─────────────────────┘
```

**Header:**
```
1. Page Load
   ┌─────────────────────┐
   │ [TU] Test User ▼   │  ← No red ring
   └─────────────────────┘
         ↓
   User clicks
         ↓
   ┌─────────────────────────┐
   │ ┌───┐ Test User         │
   │ │TU │                   │
   │ └───┘                   │
   ├─────────────────────────┤
   │ Token Balance: 100      │
   ├─────────────────────────┤
   │ 🏆 My Achievements      │
   │ 👤 My Profile           │
   ├─────────────────────────┤
   │ 🚪 Sign Out             │
   └─────────────────────────┘
```

## Color Specifications

### Red Ring
- **Color:** `#ef4444` (Tailwind red-500)
- **Width:** 2px (Tailwind ring-2)
- **Style:** Solid ring, circular
- **Opacity:** 100% (fully opaque)
- **Position:** Overlays avatar edge, absolutely positioned
- **Z-index:** Above avatar, below tooltip

### Notification Badge in Dropdown
- **Background:** Destructive variant (red)
- **Text Color:** White
- **Size:** xs (extra small)
- **Height:** 20px (h-5)
- **Padding:** 8px horizontal (px-2)
- **Border Radius:** Rounded

### Button States
```
Normal State:
  [TU]  ← Gray border, white background

Hover State:
  [TU]  ← Slightly darker background (bg-white/90)

With Notifications:
  [(TU)] ← RED RING around entire avatar

Focus State:
  [TU]  ← Focus ring for keyboard navigation
```

## Responsive Behavior

### Desktop (> 768px)
```
┌─────────────────────────────────────────────────────┐
│ [Logo] [Nav] [Nav] [Nav]           [Theme] [(TU)]  │
└─────────────────────────────────────────────────────┘
                                              ↑
                                    Red ring when notifs
```

### Tablet (768px - 1024px)
```
┌────────────────────────────────────────┐
│ [Logo] [Nav]              [Theme] [(TU)] │
└────────────────────────────────────────┘
                                     ↑
                           Red ring when notifs
```

### Mobile (< 768px)
```
┌──────────────────────────┐
│ [Logo]   [Hamburger] [(TU)] │
└──────────────────────────┘
                        ↑
              Red ring when notifs
```

## Animation Details

### Red Ring Appearance
```
Transition: none (instant appearance)
Reason: Notifications should be immediately visible
Future: Could add subtle pulse animation
```

### Dropdown Opening
```
Existing animation preserved:
- Smooth slide down
- Fade in opacity
- Transform scale
```

### Notification Panel (AuthenticatedLayout)
```
Existing animation preserved:
- Slide from right
- 300ms duration
- Ease-in-out timing
```

## Accessibility Features

### ARIA Labels
```typescript
// Without notifications
aria-label="Open user menu"

// With 1 notification
aria-label="Open notifications - 1 unread"

// With multiple notifications
aria-label="Open notifications - 5 unread"
```

### Tooltips
```
No notifications:
  "User menu"

With notifications:
  "3 new notifications"
```

### Screen Reader Announcements
- Red ring marked as `aria-hidden="true"` (purely decorative)
- Notification count included in accessible label
- Button role properly defined
- Keyboard navigation fully supported (Tab, Enter, Space)

### Keyboard Navigation
```
Tab → Focus avatar button
Enter/Space → Open panel/dropdown
Escape → Close panel/dropdown
Tab → Navigate within panel
```

## Edge Cases Handled

### 1. Zero Notifications
- No red ring shown
- Tooltip shows "User menu"
- Click opens user panel (AuthenticatedLayout)
- Dropdown has no notifications section (Header)

### 2. One Notification
- Red ring shown
- Singular text: "1 new notification"
- Click opens notifications panel
- Dropdown shows notification section with count [1]

### 3. Many Notifications (99+)
- Red ring shown
- Text: "99+ new notifications"
- Badge shows actual count
- Full list shown in notifications panel

### 4. Loading State
- Avatar shown without ring while loading
- Query enabled only when user exists
- Graceful fallback to 0 if query fails

### 5. Real-time Updates
- Polls every 5 seconds for new notifications
- Red ring appears immediately when new notification arrives
- Count updates dynamically in dropdown

## Performance Optimizations

1. **Conditional Rendering:** Notifications section only rendered when count > 0
2. **Query Caching:** React Query caches results
3. **Polling Interval:** 5 seconds balances freshness and server load
4. **CSS-only Ring:** No extra DOM manipulation for visual effect
5. **Lazy Loading:** Notification panel only loads when opened

## Browser Compatibility

Tested and working in:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

CSS features used:
- `position: absolute` (universal support)
- `border-radius: 50%` (universal support)
- Tailwind ring utilities (universal support)
- Flexbox (universal support)

---

**Note:** These are ASCII art representations. In the actual application:
- The red ring is a smooth, anti-aliased 2px border
- Colors follow the theme system (light/dark mode)
- Animations are smooth and polished
- Typography is professional and readable
