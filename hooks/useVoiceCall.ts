"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { io, Socket } from "socket.io-client"

export type CallStatus = "idle" | "connecting" | "connected" | "ended"

interface UseVoiceCallOptions {
  signalingServerUrl: string
  onStatusChange?: (status: CallStatus) => void
  onError?: (error: string) => void
}

interface Participant {
  userId: string
  socketId: string
}

interface MeetingJoinedResponse {
  meetingId: string
  participants: Participant[]
}

interface ErrorResponse {
  code: string
  message: string
}

interface UseVoiceCallReturn {
  status: CallStatus
  isMuted: boolean
  localStream: MediaStream | null
  toggleMute: () => void
  joinCall: (meetingId: string, password: string) => Promise<void>
  endCall: () => void
}

export function useVoiceCall(options: UseVoiceCallOptions): UseVoiceCallReturn {
  const { signalingServerUrl, onStatusChange, onError } = options
  const [status, setStatus] = useState<CallStatus>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const userIdRef = useRef<string>("")
  const meetingIdRef = useRef<string>("")
  const remoteUserIdRef = useRef<string | null>(null)

  const updateStatus = useCallback((newStatus: CallStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  const handleError = useCallback((error: string) => {
    onError?.(error)
    console.error(error)
  }, [onError])

  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      return stream
    } catch {
      handleError("Failed to access microphone. Please grant permission.")
      throw new Error("Microphone access denied")
    }
  }, [handleError])

  const sendIceCandidate = useCallback((candidate: RTCIceCandidate) => {
    if (socketRef.current && meetingIdRef.current && remoteUserIdRef.current) {
      socketRef.current.emit("ice-candidate", {
        meetingId: meetingIdRef.current,
        targetUserId: remoteUserIdRef.current,
        candidate: candidate.toJSON(),
      })
    }
  }, [])

  const createPeerConnection = useCallback((stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    })

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    pc.ontrack = (event) => {
      console.log("Received remote track:", event.streams[0])
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate(event.candidate)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected") {
        updateStatus("connected")
      } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        handleError("Connection lost")
        updateStatus("ended")
      }
    }

    return pc
  }, [sendIceCandidate, updateStatus, handleError])

  const handleOffer = useCallback(async (fromUserId: string, sdp: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await peerConnectionRef.current.createAnswer()
      await peerConnectionRef.current.setLocalDescription(answer)

      socketRef.current?.emit("answer", {
        meetingId: meetingIdRef.current,
        targetUserId: fromUserId,
        sdp: answer,
      })
    } catch {
      handleError("Failed to handle offer")
    }
  }, [handleError])

  const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
    } catch {
      handleError("Failed to handle answer")
    }
  }, [handleError])

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    } catch {
      handleError("Failed to add ICE candidate")
    }
  }, [handleError])

  const joinCall = useCallback(async (meetingId: string, password: string) => {
    try {
      updateStatus("connecting")

      userIdRef.current = `user-${Math.random().toString(36).substring(2, 9)}`
      meetingIdRef.current = meetingId
      remoteUserIdRef.current = null

      const stream = await getLocalStream()
      setLocalStream(stream)

      const socket = io(signalingServerUrl, {
        transports: ["websocket", "polling"],
      })
      socketRef.current = socket

      socket.on("connect", async () => {
        console.log("Connected to signaling server")

        socket.emit("join-meeting", {
          meetingId,
          password,
          userId: userIdRef.current,
        }, async (response: MeetingJoinedResponse | ErrorResponse) => {
          if ("code" in response) {
            handleError(response.message)
            updateStatus("idle")
            return
          }

          console.log("Joined meeting:", response)

          const pc = createPeerConnection(stream)
          peerConnectionRef.current = pc

          if (response.participants && response.participants.length > 0) {
            const otherUser = response.participants[0]
            remoteUserIdRef.current = otherUser.userId

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            socket.emit("offer", {
              meetingId,
              targetUserId: otherUser.userId,
              sdp: offer,
            })
          }

          updateStatus("connected")
        })
      })

      socket.on("user-joined", (data: { userId: string }) => {
        console.log("User joined:", data.userId)
        if (!remoteUserIdRef.current) {
          remoteUserIdRef.current = data.userId
        }
      })

      socket.on("offer", async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
        remoteUserIdRef.current = data.fromUserId
        await handleOffer(data.fromUserId, data.sdp)
      })

      socket.on("answer", async (data: { sdp: RTCSessionDescriptionInit }) => {
        await handleAnswer(data.sdp)
      })

      socket.on("ice-candidate", async (data: { candidate: RTCIceCandidateInit }) => {
        await handleIceCandidate(data.candidate)
      })

      socket.on("meeting-left", () => {
        console.log("User left the meeting")
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
          peerConnectionRef.current = null
        }
        updateStatus("ended")
      })

      socket.on("disconnect", () => {
        console.log("Disconnected from signaling server")
      })

      socket.on("connect_error", (error: Error) => {
        handleError(error.message || "Connection error")
      })

    } catch {
      handleError("Failed to join call")
      updateStatus("idle")
    }
  }, [signalingServerUrl, getLocalStream, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate, updateStatus, handleError])

  const endCall = useCallback(() => {
    if (socketRef.current && meetingIdRef.current && userIdRef.current) {
      socketRef.current.emit("leave-meeting", {
        meetingId: meetingIdRef.current,
        userId: userIdRef.current,
      })
      socketRef.current.disconnect()
      socketRef.current = null
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    userIdRef.current = ""
    meetingIdRef.current = ""
    remoteUserIdRef.current = null

    setIsMuted(false)
    updateStatus("ended")
  }, [localStream, updateStatus])

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [localStream])

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [localStream])

  return {
    status,
    isMuted,
    localStream,
    toggleMute,
    joinCall,
    endCall,
  }
}
