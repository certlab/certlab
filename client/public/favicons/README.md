# CertLab Favicon Options

This directory contains three different favicon options for the CertLab application. Each option is available in multiple formats to ensure compatibility across all browsers and devices.

## Available Options

### Option 1: Shield (Default) 🛡️
A shield with a checkmark, representing security and certification verification. This matches the current logo in the app header.

**Files:**
- `option1-shield.svg` - Vector source
- `option1-shield.ico` - Multi-size ICO (16x16, 32x32, 48x48)
- `option1-shield-16.png` - 16×16 PNG
- `option1-shield-32.png` - 32×32 PNG
- `option1-shield-48.png` - 48×48 PNG
- `option1-shield-180.png` - 180×180 PNG (for Apple Touch Icon)

**Theme:** Blue gradient (#3b82f6 to #2563eb)  
**Best for:** Professional, security-focused branding

### Option 2: Graduation Cap 🎓
A graduation cap representing education, learning, and academic achievement.

**Files:**
- `option2-certificate.svg` - Vector source
- `option2-certificate.ico` - Multi-size ICO (16x16, 32x32, 48x48)
- `option2-certificate-16.png` - 16×16 PNG
- `option2-certificate-32.png` - 32×32 PNG
- `option2-certificate-48.png` - 48×48 PNG
- `option2-certificate-180.png` - 180×180 PNG (for Apple Touch Icon)

**Theme:** Purple gradient (#8b5cf6 to #6366f1)  
**Best for:** Educational, academic branding

### Option 3: Open Book 📚
An open book representing learning, knowledge, and study materials.

**Files:**
- `option3-book.svg` - Vector source
- `option3-book.ico` - Multi-size ICO (16x16, 32x32, 48x48)
- `option3-book-16.png` - 16×16 PNG
- `option3-book-32.png` - 32×32 PNG
- `option3-book-48.png` - 48×48 PNG
- `option3-book-180.png` - 180×180 PNG (for Apple Touch Icon)

**Theme:** Green gradient (#10b981 to #059669)  
**Best for:** Learning-focused, study-oriented branding

## How to Switch Between Options

To change which favicon is displayed, edit `/client/index.html` and update the favicon links in the `<head>` section:

### For Option 1 (Shield - Default):
```html
<link rel="icon" type="image/x-icon" href="/favicons/option1-shield.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/option1-shield-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/option1-shield-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/option1-shield-180.png">
```

### For Option 2 (Graduation Cap):
```html
<link rel="icon" type="image/x-icon" href="/favicons/option2-certificate.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/option2-certificate-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/option2-certificate-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/option2-certificate-180.png">
```

### For Option 3 (Open Book):
```html
<link rel="icon" type="image/x-icon" href="/favicons/option3-book.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/option3-book-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/option3-book-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/option3-book-180.png">
```

## Technical Details

- **SVG Sources:** All options start with clean SVG files for easy modification
- **PNG Formats:** Available in 16×16, 32×32, 48×48, and 180×180 sizes
- **ICO Format:** Multi-resolution ICO files for legacy browser support
- **Apple Touch Icons:** 180×180 PNG for iOS home screen icons

## Customization

To create a custom favicon:
1. Edit the SVG source file to change colors, shapes, or design
2. Regenerate PNG files using: `rsvg-convert -w [size] -h [size] source.svg -o output.png`
3. Create ICO file using: `convert file-16.png file-32.png file-48.png output.ico`

## Browser Compatibility

These favicons support:
- ✅ Chrome/Edge (all versions)
- ✅ Firefox (all versions)
- ✅ Safari (all versions)
- ✅ iOS Safari (Apple Touch Icon)
- ✅ Internet Explorer 11+
- ✅ Legacy browsers (via .ico fallback)
