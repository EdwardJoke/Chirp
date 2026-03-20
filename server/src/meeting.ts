import type { MeetingRoom, User } from "./types.js";

export class MeetingManager {
  private meetings: Map<string, MeetingRoom> = new Map();
  private userToMeeting: Map<string, string> = new Map();

  createMeeting(meetingId: string, password: string): MeetingRoom {
    const meeting: MeetingRoom = {
      meetingId,
      password,
      participants: new Map(),
      createdAt: new Date(),
    };
    this.meetings.set(meetingId, meeting);
    return meeting;
  }

  getMeeting(meetingId: string): MeetingRoom | undefined {
    return this.meetings.get(meetingId);
  }

  meetingExists(meetingId: string): boolean {
    return this.meetings.has(meetingId);
  }

  validatePassword(meetingId: string, password: string): boolean {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;
    return meeting.password === password;
  }

  joinMeeting(
    meetingId: string,
    userId: string,
    socketId: string
  ): { success: boolean; error?: string; participants?: User[] } {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.participants.has(userId)) {
      meeting.participants.get(userId)!.socketId = socketId;
    } else {
      meeting.participants.set(userId, { userId, socketId });
    }

    this.userToMeeting.set(userId, meetingId);

    const participants = Array.from(meeting.participants.values()).filter(
      (p) => p.userId !== userId
    );

    return { success: true, participants };
  }

  leaveMeeting(meetingId: string, userId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      meeting.participants.delete(userId);
      if (meeting.participants.size === 0) {
        this.meetings.delete(meetingId);
      }
    }
    this.userToMeeting.delete(userId);
  }

  getParticipantSocketId(meetingId: string, userId: string): string | undefined {
    const meeting = this.meetings.get(meetingId);
    return meeting?.participants.get(userId)?.socketId;
  }

  getMeetingByUserId(userId: string): string | undefined {
    return this.userToMeeting.get(userId);
  }

  getParticipantCount(meetingId: string): number {
    return this.meetings.get(meetingId)?.participants.size ?? 0;
  }

  deleteMeeting(meetingId: string): boolean {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return false;

    for (const userId of meeting.participants.keys()) {
      this.userToMeeting.delete(userId);
    }
    meeting.participants.clear();
    return this.meetings.delete(meetingId);
  }
}

export const meetingManager = new MeetingManager();
