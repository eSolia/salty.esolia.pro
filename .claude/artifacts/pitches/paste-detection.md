# Paste Detection Pitch

## 1. Problem

**The Problem**: Users need to manually determine which field to paste content into when using Salty, slowing down their workflow and creating friction.

**When it happens**: Every time a user wants to decrypt a message they've received or encrypt a response. Users copy content from emails, messages, or documents and then must:

1. Click into the payload field
2. Paste their content
3. If it's the wrong field, clear it and paste into the correct field

**Who it affects**: All Salty users, but especially:

- Power users who encrypt/decrypt frequently throughout the day
- Mobile users where field selection requires precise tapping
- Users switching between multiple encrypted conversations
- Database integration users who receive pre-populated URLs

**Current workaround**: Users must manually:

1. Analyze what they copied (is it encrypted text or plain text?)
2. Click the appropriate field
3. Paste the content
4. If wrong, cut and paste into the other field

**Why now**: As Salty gains adoption, users are handling more encrypted messages daily. The manual field selection becomes a repetitive friction point that compounds over time.

### Evidence

- Common user pattern: Copy encrypted message from email → Open Salty → Need to remember to paste in payload field
- Mobile users report difficulty with precise field selection on small screens
- Database integration workflows would benefit from faster paste operations

---

## 2. Appetite

⏱️ **Small Batch** (2 weeks)

This is a Small Batch project because:

- Limited scope: Only handling paste events and field population
- Builds on existing UI without major changes
- Clear technical approach using standard browser APIs
- Can ship meaningful improvement without complex edge cases

---

## 3. Solution

### Approach

Monitor paste events anywhere on the page, analyze the pasted content to determine its type, and automatically populate the appropriate field. Show visual feedback so users understand what happened.

### Elements

#### Breadboard

```
Places:     [Salty Page]    →    [Auto-Detection]    →    [Field Populated]
              ↓                      ↓                       ↓
Affordances: • Paste anywhere      • Detect type          • Visual feedback
             • Manual paste        • Route to field       • Undo if needed
                                  • Show notification

Flow:
1. User copies encrypted text or plain text from anywhere
2. User pastes (Ctrl+V/Cmd+V) anywhere on Salty page
3. System detects content type and populates appropriate field
4. Visual feedback confirms the action
```

### Key Flows

1. **Encrypted Text Flow**:
   - User copies Salty cipher (basE91 format)
   - Pastes anywhere on page
   - System detects basE91 pattern
   - Populates payload field
   - Shows "Encrypted message detected" feedback

2. **Plain Text Flow**:
   - User copies plain text to encrypt
   - Pastes anywhere on page
   - System detects non-basE91 content
   - Populates payload field for encryption
   - Shows "Ready to encrypt" feedback

3. **Key Detection Flow**:
   - User copies a potential key
   - Pastes anywhere on page
   - System detects key-like pattern (short, high entropy)
   - Asks user: "Is this your encryption key?"
   - Populates key field if confirmed

---

## 4. Rabbit Holes

### ⚠️ Technical Risks

- **Clipboard API Permissions**: Different browsers handle clipboard differently → Use paste event listeners instead of Clipboard API monitoring
- **False Positives**: Plain text might look like basE91 → Set confidence threshold and provide easy undo

### ⚠️ Design Complexity

- **Multiple Paste Handling**: User might paste multiple times → Only auto-populate empty fields
- **Field Focus Conflicts**: User explicitly focusing a field → Respect manual field selection over auto-detection

### ⚠️ Integration Concerns

- **Mobile Paste Gestures**: Different paste methods on mobile → Ensure all paste events are captured
- **Existing URL Parameters**: Pre-populated fields from URLs → Don't override already populated fields

---

## 5. No-gos

We are **NOT**:

- ❌ Building clipboard monitoring that runs when Salty isn't active
- ❌ Supporting drag-and-drop (separate feature, different implementation)
- ❌ Auto-detecting content from page load or navigation
- ❌ Integrating with browser extensions or system clipboard managers
- ❌ Storing paste history or clipboard content

These are out of scope because:

- Background clipboard monitoring raises privacy concerns
- Drag-and-drop is a different interaction pattern requiring separate shaping
- We want to maintain Salty's privacy-first approach with no data persistence
