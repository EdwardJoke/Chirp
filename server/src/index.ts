import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { meetingManager } from "./meeting.js";
import { setupSocketHandlers } from "./socket.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.post("/api/meetings", (req, res) => {
  const { meetingId, password } = req.body;

  if (!meetingId || !password) {
    return res.status(400).json({ error: "meetingId and password are required" });
  }

  if (meetingManager.meetingExists(meetingId)) {
    return res.status(409).json({ error: "Meeting already exists" });
  }

  const meeting = meetingManager.createMeeting(meetingId, password);
  res.status(201).json({
    meetingId: meeting.meetingId,
    createdAt: meeting.createdAt.toISOString(),
  });
});

app.delete("/api/meetings/:meetingId", (req, res) => {
  const { meetingId } = req.params;

  if (!meetingManager.meetingExists(meetingId)) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  meetingManager.deleteMeeting(meetingId);
  res.status(204).send();
});

app.get("/api/meetings/:meetingId", (req, res) => {
  const { meetingId } = req.params;

  const exists = meetingManager.meetingExists(meetingId);
  const participantCount = meetingManager.getParticipantCount(meetingId);

  res.json({
    exists,
    participantCount,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Chirp signaling server running on port ${PORT}`);
});
