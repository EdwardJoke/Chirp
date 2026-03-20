import { Server, Socket } from "socket.io";
import {
  JoinMeetingPayload,
  LeaveMeetingPayload,
  OfferPayload,
  AnswerPayload,
  IceCandidatePayload,
  MeetingJoinedResponse,
  ErrorResponse,
} from "./types.js";
import { meetingManager } from "./meeting.js";

export function setupSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on(
      "join-meeting",
      (payload: JoinMeetingPayload, callback: (response: MeetingJoinedResponse | ErrorResponse) => void) => {
        const { meetingId, password, userId, username } = payload;

        if (!meetingManager.meetingExists(meetingId)) {
          const error: ErrorResponse = { code: "MEETING_NOT_FOUND", message: "Meeting does not exist" };
          return callback(error);
        }

        if (!meetingManager.validatePassword(meetingId, password)) {
          const error: ErrorResponse = { code: "INVALID_PASSWORD", message: "Incorrect password" };
          return callback(error);
        }

        const result = meetingManager.joinMeeting(meetingId, userId, username, socket.id);
        if (!result.success) {
          const error: ErrorResponse = { code: "JOIN_FAILED", message: result.error || "Failed to join meeting" };
          return callback(error);
        }

        socket.join(meetingId);
        socket.data.userId = userId;
        socket.data.username = username;

        const response: MeetingJoinedResponse = {
          meetingId,
          participants: result.participants || [],
        };

        socket.to(meetingId).emit("user-joined", { userId, username });
        io.to(meetingId).emit("participants-update", meetingManager.getAllParticipants(meetingId));

        callback(response);
      }
    );

    socket.on("leave-meeting", (payload: LeaveMeetingPayload) => {
      const { meetingId, userId } = payload;

      meetingManager.leaveMeeting(meetingId, userId);
      socket.leave(meetingId);

      socket.to(meetingId).emit("meeting-left", { userId });
      io.to(meetingId).emit("participants-update", meetingManager.getAllParticipants(meetingId));
    });

    socket.on("offer", (payload: OfferPayload) => {
      const { meetingId, targetUserId, sdp } = payload;
      const targetSocketId = meetingManager.getParticipantSocketId(meetingId, targetUserId);
      const fromUserId = socket.data.userId;

      if (targetSocketId && fromUserId) {
        io.to(targetSocketId).emit("offer", {
          fromUserId,
          sdp,
        });
      }
    });

    socket.on("answer", (payload: AnswerPayload) => {
      const { meetingId, targetUserId, sdp } = payload;
      const targetSocketId = meetingManager.getParticipantSocketId(meetingId, targetUserId);
      const fromUserId = socket.data.userId;

      if (targetSocketId && fromUserId) {
        io.to(targetSocketId).emit("answer", {
          fromUserId,
          sdp,
        });
      }
    });

    socket.on("ice-candidate", (payload: IceCandidatePayload) => {
      const { meetingId, targetUserId, candidate } = payload;
      const targetSocketId = meetingManager.getParticipantSocketId(meetingId, targetUserId);
      const fromUserId = socket.data.userId;

      if (targetSocketId && fromUserId) {
        io.to(targetSocketId).emit("ice-candidate", {
          fromUserId,
          candidate,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);

      const meetingId = meetingManager.getMeetingByUserId(socket.data.userId);
      if (meetingId) {
        const userId = socket.data.userId;
        meetingManager.leaveMeeting(meetingId, userId);
        socket.to(meetingId).emit("meeting-left", { userId });
        io.to(meetingId).emit("participants-update", meetingManager.getAllParticipants(meetingId));
      }
    });
  });
}
