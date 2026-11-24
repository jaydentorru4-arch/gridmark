# Security Specification & Payload-First Security TDD

## 1. Data Invariants

1. **Identity & PII Isolation**: `privateUsers/{uid}` contains `email` and is readable/writable strictly by `request.auth.uid == uid`. `players/{uid}` stores only public handle, avatar, bio, presence, and game stats—never email or PII.
2. **Email Verification Gate**: Every write operation requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Stat Integrity & Anti-Inflation**: Player stats (`wins`, `losses`, `draws`, `gamesPlayed`, `points`) can only be initialized to `0` on registration, and incremented by exactly `1` match outcome inside an atomic transaction/batch that simultaneously transitions `games/{lastMatchId}` from `playing` to `finished`, matching the actual `winner` / `winnerUid` of that game and enforcing `lastMatchId != existing().lastMatchId`.
4. **Turn-Based Move Authority**: Only the active turn player (`X` -> `playerXUid`, `O` -> `playerOUid`) can advance `games/{gameId}` while `status == 'playing'`, incrementing `moveCount` by exactly `1`.
5. **Terminal State Locking**: Once `games/{gameId}.status` is `finished` or `abandoned`, board, winner, and participants are immutable (only `rematchGameId` can be linked once from `""`). Once `challenges/{challengeId}.status` leaves `pending`, no further updates are permitted.
6. **Private Room Isolation**: Private waiting rooms (`isPublicOpen == false`) cannot be scraped via `list` queries by non-participants; joining requires knowing the 6-character `inviteCode` via `roomCodes/{inviteCode}`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **PII Leak (`privateUsers/{otherUid}` read)**: Authenticated user A tries `getDoc(doc(db, 'privateUsers', 'userB'))`. Expected: `PERMISSION_DENIED`.
2. **Identity Spoofing on Registration (`players/{uid}` create)**: User A creates `players/userB` with `uid: 'userB'`. Expected: `PERMISSION_DENIED`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create `players/{uid}`. Expected: `PERMISSION_DENIED`.
4. **Stat Inflation on Create**: User A registers `players/userA` with `wins: 999, points: 2997`. Expected: `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: User A updates `players/userA` with `{ bio: 'hi', isAdmin: true }`. Expected: `PERMISSION_DENIED`.
6. **Out-of-Turn Move**: In an active game where `currentTurn == 'X'`, Player O tries to update `board` and `moveCount`. Expected: `PERMISSION_DENIED`.
7. **Post-Finish Score Tampering**: After `games/{gameId}` has `status: 'finished'`, Player O tries to update `winner: 'O'` and `winnerUid: playerOUid`. Expected: `PERMISSION_DENIED`.
8. **Double-Counting Same Match**: Player A tries to update `players/userA` with `wins: existing + 1` using the same `lastMatchId` twice. Expected: `PERMISSION_DENIED`.
9. **Unauthorized Room List Scraping**: User A runs `list` on `games` without constraining to `participantUids` or `isPublicOpen == true`. Expected: `PERMISSION_DENIED`.
10. **Self-Challenge**: User A creates `challenges/{id}` with `challengerUid: 'userA', targetUid: 'userA'`. Expected: `PERMISSION_DENIED`.
11. **Challenge Hijack**: User C (not `targetUid`) tries to update `challenges/{id}` to `status: 'accepted'`. Expected: `PERMISSION_DENIED`.
12. **Resource Poisoning via Oversized ID / String**: Attacker submits a 2KB string in `bio` or `gameId` (`isValidId` / `.size()` check). Expected: `PERMISSION_DENIED`.
