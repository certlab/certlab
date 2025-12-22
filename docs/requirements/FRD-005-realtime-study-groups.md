# FRD-005: Real-Time Study Groups

## Metadata

| Field | Value |
|-------|-------|
| **FRD ID** | FRD-005 |
| **Feature Name** | Real-Time Study Groups |
| **Priority** | High |
| **Status** | Planned |
| **Target Release** | Q3 2025 |
| **Complexity** | Very High |
| **Estimated Effort** | 40-50 developer-days |
| **Owner** | Full Stack Team |
| **Related FRDs** | FRD-006 (Community Question Bank) |
| **Dependencies** | Firebase/Firestore (Cloud Sync), WebRTC |

## Overview

### Purpose
Enable true collaborative learning with real-time group quiz sessions, live leaderboards, group chat, and video/audio calls for up to 50 concurrent participants.

### Business Value
- Competitive differentiation through social learning
- Increased user engagement and retention (+25%)
- Viral growth through group invitations
- Premium feature potential

### User Impact
- Social learning reduces study isolation
- Peer support and accountability
- Competitive motivation via leaderboards
- Learn from others' explanations

### Technical Impact
- WebRTC peer-to-peer connections
- Firebase Realtime Database for presence
- Firestore for group data persistence
- WebSocket for chat and live updates
- Redis (optional) for presence at scale

## User Stories

```
As a student preparing for certification,
I want to study with peers in real-time,
So that I stay motivated and can learn from others.
```

```
As a study group organizer,
I want to host live quiz sessions,
So that my group can practice together synchronously.
```

```
As a group participant,
I want to see my ranking in real-time during quizzes,
So that I can stay competitive and engaged.
```

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: Create and manage study groups
  - Acceptance: Users can create groups with name, description, and privacy settings
  - Example: "CISSP Study Group - Evening Sessions" (public/private)

- [ ] **FR-2**: Group member management
  - Acceptance: Owners can invite, accept, remove members; assign roles
  - Example: Owner assigns "Moderator" role to trusted member

- [ ] **FR-3**: Real-time group quiz sessions
  - Acceptance: Owner starts quiz, all members see same questions synchronously
  - Example: 10 members take quiz together, submit answers within time limit

- [ ] **FR-4**: Live leaderboard during quiz
  - Acceptance: Leaderboard updates in real-time showing scores and rankings
  - Example: Screen shows "1. Alice (850pts), 2. Bob (820pts)..."

- [ ] **FR-5**: Group chat with message history
  - Acceptance: Members can send text messages, see history, online indicators
  - Example: "Alice: What's the answer to #5?" appears instantly for all

- [ ] **FR-6**: Presence detection (who's online)
  - Acceptance: See which group members are currently online
  - Example: Green dot next to online members' names

### Should Have (P1)

- [ ] **FR-7**: Video/audio calls (WebRTC)
  - Acceptance: Up to 10 members can join video call
  - Example: Study session with video chat for discussion

- [ ] **FR-8**: Screen sharing
  - Acceptance: Member can share screen for explanations
  - Example: Show diagram while explaining concept

- [ ] **FR-9**: Breakout rooms (pair study)
  - Acceptance: Split into smaller groups temporarily
  - Example: Pairs practice questions together

- [ ] **FR-10**: Group analytics dashboard
  - Acceptance: See group progress, participation, top performers
  - Example: Chart showing average scores over time

### Could Have (P2)

- [ ] **FR-11**: Whiteboard collaboration
- [ ] **FR-12**: Recording sessions
- [ ] **FR-13**: Scheduled recurring sessions

## Technical Specifications

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend                         │
│  - GroupList, GroupChat, QuizSession components          │
└───────────┬──────────────────────────────────────────────┘
            │
┌───────────▼──────────────────────────────────────────────┐
│                  Firebase Services                        │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Firestore    │  │ Realtime DB  │  │   WebRTC     │ │
│  │  (Group Data)  │  │  (Presence)  │  │ (Video/Audio)│ │
│  └────────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Key Components

#### GroupService
```typescript
class GroupService {
  // CRUD operations
  async createGroup(data: CreateGroupRequest): Promise<Group>;
  async joinGroup(groupId: string, userId: string): Promise<void>;
  async leaveGroup(groupId: string, userId: string): Promise<void>;
  
  // Real-time operations
  subscribeToPresence(groupId: string, callback: (members: OnlineMember[]) => void);
  subscribeToChat(groupId: string, callback: (message: ChatMessage) => void);
  sendMessage(groupId: string, message: string): Promise<void>;
  
  // Quiz session
  async startGroupQuiz(groupId: string, quizConfig: QuizConfig): Promise<SessionId>;
  subscribeToQuizSession(sessionId: string, callback: (state: QuizState) => void);
  submitAnswer(sessionId: string, answer: Answer): Promise<void>;
}
```

#### WebRTCService
```typescript
class WebRTCService {
  // Connection management
  async joinCall(groupId: string): Promise<void>;
  async leaveCall(): Promise<void>;
  
  // Media controls
  toggleMicrophone(): void;
  toggleCamera(): void;
  
  // Screen sharing
  async startScreenShare(): Promise<void>;
  stopScreenShare(): void;
  
  // Peer management
  getPeers(): Peer[];
  onPeerJoined(callback: (peer: Peer) => void);
  onPeerLeft(callback: (peerId: string) => void);
}
```

## Data Models

```typescript
interface Group {
  id: string;
  name: string;
  description: string;
  privacy: 'public' | 'private';
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  categories: string[];          // Focus certifications
  createdAt: Date;
  updatedAt: Date;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'member';
  joinedAt: Date;
  lastActive: Date;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  message: string;
  type: 'text' | 'system';
  timestamp: Date;
}

interface GroupQuizSession {
  id: string;
  groupId: string;
  quizId: string;
  status: 'waiting' | 'active' | 'completed';
  startTime: Date;
  endTime?: Date;
  participants: SessionParticipant[];
  currentQuestion: number;
  leaderboard: LeaderboardEntry[];
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number;
  correctAnswers: number;
  averageTime: number;
  rank: number;
}
```

## Implementation Checklist

### Phase 1: Foundation (8 days)
- [ ] Set up Firebase Realtime Database
- [ ] Create Firestore collections (groups, members, messages)
- [ ] Implement security rules
- [ ] Create group data models

### Phase 2: Group Management (7 days)
- [ ] Create/edit/delete groups
- [ ] Invite/join/leave functionality
- [ ] Member role management
- [ ] Group discovery page

### Phase 3: Real-Time Chat (6 days)
- [ ] Implement chat UI component
- [ ] Firebase Realtime Database integration
- [ ] Message history with Firestore
- [ ] Presence indicators

### Phase 4: Group Quiz Sessions (10 days)
- [ ] Session state management
- [ ] Synchronized question display
- [ ] Real-time answer submission
- [ ] Live leaderboard updates
- [ ] Results page

### Phase 5: WebRTC Integration (12 days)
- [ ] Set up WebRTC signaling server
- [ ] Implement peer connections
- [ ] Audio/video controls
- [ ] Screen sharing
- [ ] Handle connection failures

### Phase 6: Testing & Optimization (7 days)
- [ ] Load testing (50 concurrent users)
- [ ] WebRTC connection reliability
- [ ] Firestore query optimization
- [ ] Edge case handling

## Dependencies

### Required Libraries
```json
{
  "dependencies": {
    "firebase": "^10.0.0",
    "simple-peer": "^9.11.1",
    "socket.io-client": "^4.5.0"
  }
}
```

### Infrastructure
- Firebase Firestore
- Firebase Realtime Database
- Firebase Authentication
- STUN/TURN servers for WebRTC

## Success Metrics

- **Adoption**: >30% of users join at least one group
- **Engagement**: 2+ group sessions per week per active group
- **Retention**: +25% retention for users in active groups
- **Performance**: <2s latency for chat messages
- **Scalability**: Support 1000+ concurrent groups

## References

- [WebRTC Documentation](https://webrtc.org/)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Simple Peer Library](https://github.com/feross/simple-peer)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Author**: AI Agent  
**Status**: Draft - Ready for Review
