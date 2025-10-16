# Theme Update - HuggingFace Style 🎨

**Date:** 2025-10-07
**Inspiration:** HuggingFace dark mode design

---

## 🎯 Changes Made

### 1. Dark Theme Colors (HuggingFace Style)

**Before:**
- Background: `#121212` (pure black)
- Paper: `#1e1e1e` (dark gray)
- Primary: `#90caf9` (light blue)

**After:**
- Background: `#0b0f19` (deep navy - HuggingFace style)
- Paper: `#161b26` (slightly lighter navy for cards)
- Primary: `#FF9D00` (HuggingFace orange accent)
- Secondary: `#60A5FA` (light blue accent)
- Text: `#e5e7eb` / `#9ca3af` (soft gray)
- Divider: `rgba(255,255,255,0.08)` (subtle borders)

### 2. Typography (HuggingFace Fonts)

**Primary Font:** `IBM Plex Sans`
- Similar to HuggingFace's clean, modern font
- Professional and readable
- Good for technical content

**Fallback:** `Inter`, `Roboto`, `Helvetica`, `Arial`, sans-serif

**Weights Used:**
- Headings: 600-700 (semibold/bold)
- Body: 400-500 (regular/medium)
- Buttons: 500 (medium)

### 3. Component Styling

**Cards:**
- No gradient background images (cleaner look)
- Subtle border in dark mode: `1px solid rgba(255,255,255,0.08)`
- Soft shadows: `0 1px 3px rgba(0,0,0,0.4)`

**AppBar/Navbar:**
- Matches background color (`#0b0f19`)
- Subtle bottom border
- No background images

**Buttons:**
- Rounded corners: 6px
- No text transform (preserve case)
- Medium font weight (500)

---

## 📁 Files Modified

### User Frontend:
1. **`apps/user-frontend/src/hooks/useColorMode.tsx`**
   - Updated palette colors to HuggingFace style
   - Added custom component overrides
   - Added typography configuration

2. **`apps/user-frontend/index.html`**
   - Added IBM Plex Sans font import
   - Added Inter font as fallback

### Admin Frontend:
1. **`apps/admin-frontend/src/hooks/useColorMode.tsx`** (NEW)
   - Copied from user-frontend with same theme

2. **`apps/admin-frontend/src/main.tsx`**
   - Replaced `ThemeProvider` with `ColorModeProvider`
   - Removed old `theme` import

3. **`apps/admin-frontend/src/components/Navbar.tsx`**
   - Added theme toggle button (moon/sun icon)
   - Imports `useColorMode` hook

4. **`apps/admin-frontend/index.html`**
   - Added IBM Plex Sans font import

---

## 🎨 Color Palette

### Light Mode:
```css
background.default: #f5f5f5
background.paper: #ffffff
primary: #1976d2
text.primary: rgba(0,0,0,0.87)
text.secondary: rgba(0,0,0,0.6)
```

### Dark Mode (HuggingFace Style):
```css
background.default: #0b0f19    /* Deep navy */
background.paper: #161b26      /* Card background */
primary: #FF9D00               /* Orange accent */
secondary: #60A5FA             /* Blue accent */
text.primary: #e5e7eb          /* Light gray */
text.secondary: #9ca3af        /* Muted gray */
divider: rgba(255,255,255,0.08) /* Subtle borders */
```

---

## 🔤 Fonts

### IBM Plex Sans
- **Designer:** Mike Abbink (IBM)
- **Style:** Neo-Grotesque sans-serif
- **Similar to:** HuggingFace UI font
- **Weights:** 300, 400, 500, 600, 700
- **Source:** Google Fonts

### Inter (Fallback)
- **Designer:** Rasmus Andersson
- **Style:** Modern sans-serif
- **Optimized:** For UI/screens
- **Weights:** 300, 400, 500, 600, 700

---

## 🚀 How to Test

### User Frontend:
1. Start: `cd apps/user-frontend && npm run dev`
2. Open: http://localhost:5173
3. Click moon icon (top right) to toggle dark mode
4. Check:
   - Background is deep navy (`#0b0f19`)
   - Cards have subtle borders
   - Orange accent on buttons
   - IBM Plex Sans font

### Admin Frontend:
1. Start: `cd apps/admin-frontend && npm run dev`
2. Open: http://localhost:5174
3. Sign in: `admin@example.com` / `admin123`
4. Click moon/sun icon to toggle theme
5. Verify same styling as user frontend

---

## ✅ Features

**Both Frontends:**
- ✅ Dark mode toggle in navbar
- ✅ Theme persists in localStorage
- ✅ HuggingFace-style navy background
- ✅ IBM Plex Sans typography
- ✅ Orange primary accent (#FF9D00)
- ✅ Subtle card borders
- ✅ Clean, modern UI

---

## 📊 Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **Dark BG** | #121212 (black) | #0b0f19 (navy) |
| **Cards** | #1e1e1e (gray) | #161b26 (navy) |
| **Accent** | #90caf9 (blue) | #FF9D00 (orange) |
| **Font** | Roboto | IBM Plex Sans |
| **Borders** | None | Subtle rgba borders |
| **Admin Toggle** | ❌ None | ✅ Present |

---

## 🎯 Design Philosophy

Inspired by **HuggingFace** design:

1. **Readability First**
   - Soft text colors (#e5e7eb) instead of pure white
   - Good contrast without being harsh

2. **Depth Through Subtle Borders**
   - Cards have `1px solid rgba(255,255,255,0.08)`
   - Creates depth without heavy shadows

3. **Navy > Black**
   - Deep navy (#0b0f19) is warmer than pure black
   - Reduces eye strain
   - More professional appearance

4. **Accent Color Pop**
   - Orange (#FF9D00) stands out against navy
   - Used sparingly for important actions
   - Creates visual hierarchy

5. **Clean Typography**
   - IBM Plex Sans is clear and professional
   - Good for technical/data-heavy UIs
   - Consistent weights across hierarchy

---

## 🔮 Future Enhancements

- [ ] Add system preference detection (`prefers-color-scheme`)
- [ ] Custom accent color picker
- [ ] More theme variants (auto/light/dark)
- [ ] Font size preferences
- [ ] High contrast mode for accessibility

---

**Result:** Modern, professional UI matching HuggingFace aesthetic ✨
