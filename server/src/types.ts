export interface User {
  userId: string;
  username: string;
  socketId: string;
}

export interface MeetingRoom {
  meetingId: string;
  password: string;
  participants: Map<string, User>;
  createdAt: Date;
}

export interface MeetingInfo {
  meetingId: string;
  createdAt: string;
}

export interface JoinMeetingPayload {
  meetingId: string;
  password: string;
  userId: string;
  username: string;
}

export interface LeaveMeetingPayload {
  meetingId: string;
  userId: string;
}

export interface OfferPayload {
  meetingId: string;
  targetUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  meetingId: string;
  targetUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidatePayload {
  meetingId: string;
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface MeetingJoinedResponse {
  meetingId: string;
  participants: User[];
}

export interface ErrorResponse {
  code: string;
  message: string;
}
