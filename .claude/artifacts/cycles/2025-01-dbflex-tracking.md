# Cycle Plan - dbFLEX Integration Sprint

**Dates**: January 6 - January 17, 2025 (2 weeks)
**Type**: Small Batch Sprint

## Bets for This Cycle

### 🎯 Bet 1: dbFLEX Link Tracking

**Team**: AI Executor + Human Reviewer
**Appetite**: 2 weeks (Small Batch)
**Pitch**: [dbflex-link-tracking.md](../pitches/dbflex-link-tracking.md)

**Why we're betting on this**:

- Clients need visibility into link access for compliance and confirmation
- Admin team needs audit trails for support and troubleshooting
- Clear technical approach with bounded scope
- Enables enterprise adoption of Salty + dbFLEX workflow

**Success looks like**:

- [ ] Links with `?id=` parameter trigger tracking to dbFLEX
- [ ] Server endpoint validates and forwards tracking data
- [ ] dbFLEX records update with access timestamps
- [ ] Zero impact on users without ID parameters
- [ ] Graceful failure that doesn't affect core functionality
- [ ] Environment-based configuration for easy deployment

**Key Deliverables**:

1. Client-side tracking detection and beacon
2. Server `/api/track-access` endpoint
3. dbFLEX API integration with auth
4. Rate limiting on tracking endpoint
5. Basic tests for ID validation and API calls

---

## Not Betting On

These were considered but didn't make the cut:

### ❌ Paste Detection

**Reason**: While it benefits all users, dbFLEX tracking has immediate client demand and revenue impact
**Future**: Strong candidate for next cycle - already shaped and ready

### ❌ Encryption Strength Indicator

**Reason**: Nice-to-have but not blocking any users
**Future**: Needs shaping before we can bet on it

### ❌ File Encryption

**Reason**: Large scope requiring significant technical investigation
**Future**: Needs shaping as a Big Batch (6 week) project

## Technical Constraints

- Must not affect page load performance
- Cannot store any tracking data in Salty (forward-only)
- Must handle dbFLEX API downtime gracefully
- ID format limited to `YYYYMMDD-NNN` pattern

## Implementation Approach

Given this is an AI-optimized Shape Up cycle:

1. **Translate** the pitch into explicit tasks (30 min)
2. **Execute** the implementation in one run
3. **Fix** any issues in 2-5 iterations if needed

## Important Milestones

- **Start**: January 6, 2025
- **Mid-point Check**: January 10 (API integration working)
- **Integration Complete**: January 15
- **Testing & Polish**: January 16-17
- **Ship**: January 17, 2025

## Notes

- This is our first client-requested integration feature
- Sets precedent for future enterprise integrations
- Keep security and privacy as top priorities
- Document the integration pattern for future similar work
