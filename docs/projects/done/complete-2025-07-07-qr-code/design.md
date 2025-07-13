# QR Code Feature Design for Salty

## Overview

Add QR code generation for shareable URLs to enable quick, secure sharing of encrypted content across devices and networks.

## Use Cases

### 1. Mobile-to-Desktop Sharing

- User encrypts sensitive data on their desktop computer
- Instead of typing a long URL on their phone, they scan the QR code
- Opens directly in mobile browser with the encrypted payload pre-loaded
- They just enter the key on their phone to decrypt

### 2. In-Person Secure Sharing

- During a meeting, someone needs to share credentials/passwords
- They encrypt on their laptop and show QR code on screen
- Others scan with their phones without anything being spoken aloud
- More secure than verbally sharing or writing down passwords

### 3. Print-to-Digital Bridge

- User needs to include encrypted data in printed documents
- QR code can be printed on paper (reports, letters, invoices)
- Recipients scan the code to access the encrypted content
- Useful for secure document workflows

### 4. Cross-Network Sharing

- In environments where copy/paste between networks is restricted
- QR code can be displayed on one screen and scanned from another
- Bypasses network isolation for legitimate secure data transfer

### 5. Quick Event/Conference Sharing

- Speaker wants to share encrypted content with audience
- Displays QR code on presentation slide
- Hundreds of people can quickly capture it simultaneously
- No need to type URLs or share via insecure channels

## UI/UX Design

### Location in Interface

```
[Encryption Results Section]
├── Formatted Encrypted Text [Copy button]
├── Compressed Version [Copy button]
├── Shareable URL [Copy URL button]
└── QR Code Section [Show QR button] ← New addition
    └── When clicked: Modal/popup with large QR code
        ├── QR code image (encoding the full URL with payload)
        ├── "Scan to open encrypted content" instruction
        └── [Close] button
```

### Visual Design

- QR code section matches existing blue-themed design
- "Show QR" button uses consistent styling (blue background)
- Modal overlay with semi-transparent background
- Large QR code (300x300px minimum) for easy scanning
- Download button for saving QR code image

### User Flow

1. User encrypts text and sees results
2. New "QR Code" section appears below "Shareable URL"
3. User clicks "Show QR" button
4. Modal appears with large QR code
5. Others can scan directly from screen
6. Optional: Download QR code as image file

## Technical Implementation

### Libraries

- Use a lightweight, client-side QR code library
- No external dependencies or API calls
- Generate QR codes entirely in the browser

### QR Code Specifications

- Error correction level: Medium (15% damage tolerance)
- Module size: Dynamic based on content length
- Format: SVG or Canvas (for better scaling)
- Encoding: UTF-8 for international URL support

### Features

- Generate QR code from shareable URL
- Include full URL with encoded payload parameter
- Modal popup for display
- Download as PNG/SVG option
- Responsive sizing for mobile devices

### Security Considerations

- QR codes contain the same URL that's already visible
- No additional sensitive data encoded
- Generated entirely client-side
- No data sent to external services

### Performance

- Lazy load QR library only when needed
- Cache generated QR codes during session
- Optimize for URLs up to 2KB (typical max)

## Implementation Phases

### Phase 1: Basic QR Display

- Add QR code section to results
- Implement modal popup
- Generate QR from URL
- Basic styling

### Phase 2: Enhanced Features

- Download QR as image
- Print-friendly version
- Size options (S/M/L)
- Copy QR image to clipboard

### Phase 3: Advanced Options

- Custom branding overlay
- Batch QR generation
- QR code with instructions template
- Analytics for QR scans (optional)

## Success Metrics

- Reduced time to share encrypted content
- Increased mobile usage
- Positive user feedback on ease of sharing
- Successful cross-device workflows

## Accessibility

- Alt text for QR images
- Keyboard navigation for modal
- Screen reader announcements
- High contrast mode support

---

Created: 2025-07-03
Status: Approved for implementation
