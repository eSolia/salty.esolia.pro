# Future Enhancement Details for Salty

This document expands on the potential future enhancements for Salty, providing detailed explanations to help with prioritization and planning.

## 1. Paste Detection to Auto-Populate Fields

### Overview

Implement intelligent clipboard monitoring to detect when users paste encrypted content, automatically placing it in the correct field and detecting whether it's for encryption or decryption.

### Features

- **Smart Paste Detection**: Monitor paste events on the page
- **Content Analysis**: Automatically detect if pasted content is:
  - Salty encrypted text (basE91 format)
  - Plain text to encrypt
  - A decryption key
- **Auto-Field Population**: Place content in the appropriate field based on detection
- **Multi-format Support**: Handle various paste formats:
  - Direct basE91 cipher text
  - Formatted Salty messages with headers/footers
  - Keys in various formats

### Technical Implementation

- Use Clipboard API with paste event listeners
- Pattern matching for Salty cipher format detection
- Heuristics for key vs. payload detection
- User confirmation for ambiguous cases

### User Benefits

- Faster workflow for frequent users
- Reduced manual field selection
- Better mobile experience (paste once vs. multiple taps)
- Improved accessibility

### Security Considerations

- Only process paste events within the application
- No background clipboard monitoring
- Clear user consent and control
- Option to disable auto-detection

---

## 2. Encryption Strength Indicator

### Overview

Provide visual feedback about the security strength of the user's encryption key, helping users choose stronger passphrases.

### Features

- **Real-time Strength Analysis**:
  - Character length assessment
  - Character variety (uppercase, lowercase, numbers, symbols)
  - Common password detection
  - Dictionary word detection
  - Pattern detection (sequences, repetitions)

- **Visual Indicators**:
  - Color-coded strength meter (red → yellow → green)
  - Percentage or score display
  - Specific improvement suggestions
  - Estimated crack time display

- **Entropy Calculation**:
  - Calculate bits of entropy
  - Show comparison to recommended minimums
  - Explain entropy in user-friendly terms

### Technical Implementation

- Client-side zxcvbn library or similar
- Custom scoring algorithm for Salty's specific needs
- Real-time updates as user types
- No key transmission to server

### User Benefits

- Education about password security
- Immediate feedback for improvement
- Reduced risk of weak encryption
- Compliance with security best practices

### UI/UX Design

- Unobtrusive meter below key field
- Optional detailed analysis popup
- Contextual tips and suggestions
- Option to generate strong keys

---

## 3. File Encryption/Decryption Support

### Overview

Extend Salty's encryption capabilities to handle files, not just text, while maintaining the same security standards and ease of use.

### Features

- **File Input Methods**:
  - Drag and drop interface
  - File picker button
  - Multiple file selection
  - Folder encryption (with structure preservation)

- **File Types Support**:
  - Documents (PDF, Word, Excel, etc.)
  - Images (with optional preview)
  - Archives (ZIP, TAR)
  - Any binary file up to size limit

- **Processing Options**:
  - Individual file encryption
  - Batch processing with progress bar
  - Encrypted archive creation
  - Metadata preservation options

- **Output Formats**:
  - Encrypted file download
  - Encrypted ZIP archive
  - Base64 encoded for sharing
  - QR codes for small files

### Technical Implementation

- File API for reading files
- Streaming encryption for large files
- Web Workers for non-blocking processing
- Progress events and cancellation
- Memory-efficient chunked processing

### User Benefits

- Secure file sharing without external tools
- Consistent encryption across text and files
- Batch processing saves time
- Works entirely in browser (privacy)

### Security Considerations

- File size limits to prevent DoS
- Memory usage monitoring
- Secure file handling and cleanup
- Optional filename encryption

---

## 4. Batch Encryption Mode

### Overview

Process multiple text segments or messages simultaneously, useful for encrypting multiple passwords, notes, or data entries efficiently.

### Features

- **Input Methods**:
  - Multi-line text area with delimiters
  - CSV/TSV import
  - JSON array support
  - Bulk paste with auto-parsing

- **Processing Options**:
  - Same key for all items
  - Different key per item
  - Key derivation from master password
  - Labeled encryption (preserve identifiers)

- **Output Formats**:
  - Individual encrypted items
  - CSV/TSV export
  - JSON export
  - ZIP file with separate files
  - Combined document with separators

- **Management Features**:
  - Progress tracking
  - Error handling per item
  - Partial success handling
  - Resume interrupted batches

### Technical Implementation

- Efficient batch processing algorithms
- Parallel encryption using Web Workers
- Progress reporting and cancellation
- Memory management for large batches

### User Benefits

- Time savings for multiple items
- Consistent encryption workflow
- Bulk password management
- Database migration support

### Use Cases

- Password manager migrations
- Bulk credential updates
- Secure note collections
- Data export preparation

---

## 5. API Rate Limit Dashboard

### Overview

Provide visibility into API usage, rate limits, and consumption patterns for users and administrators.

### Features

- **Real-time Monitoring**:
  - Current rate limit status
  - Requests remaining
  - Time until reset
  - Historical usage graphs

- **User Dashboard**:
  - Personal API usage stats
  - Rate limit warnings
  - Usage patterns and trends
  - Quota consumption alerts

- **Admin Dashboard**:
  - Global usage statistics
  - Per-user/IP analytics
  - Abuse detection alerts
  - Rate limit policy management

- **Analytics Features**:
  - Usage by time of day
  - Geographic distribution
  - Endpoint popularity
  - Error rate tracking

### Technical Implementation

- Real-time data from rate limiter
- WebSocket for live updates
- Time-series data storage
- Efficient data aggregation
- RESTful API for data access

### User Benefits

- Transparency about limits
- Usage optimization guidance
- Prevent unexpected blocks
- Plan API usage better

### Admin Benefits

- Identify abuse patterns
- Optimize rate limit policies
- Capacity planning data
- User behavior insights

### Visualization Options

- Line graphs for trends
- Gauge charts for current status
- Heat maps for patterns
- Tabular data with filtering

---

## Implementation Priority Recommendations

### High Priority (User Impact + Ease)

1. **Paste Detection**: High user value, moderate complexity
2. **Encryption Strength Indicator**: Security improvement, low complexity

### Medium Priority (Valuable but Complex)

3. **File Encryption**: High value, high complexity
4. **Batch Mode**: Specific use cases, moderate complexity

### Lower Priority (Nice to Have)

5. **API Dashboard**: Admin focused, requires infrastructure

## Technical Considerations

### Performance

- All features must maintain current performance standards
- Use Web Workers for CPU-intensive operations
- Implement progressive enhancement
- Maintain mobile device compatibility

### Security

- No feature should compromise current security model
- All processing remains client-side where possible
- Maintain zero-knowledge architecture
- Regular security audits for new features

### User Experience

- Features should be discoverable but not overwhelming
- Maintain clean, simple interface
- Progressive disclosure of advanced features
- Comprehensive help documentation

---

Created: 2025-07-03
Status: For Review and Prioritization
