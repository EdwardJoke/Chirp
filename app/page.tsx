"use client"

import { useState } from "react"
import {
  VideoCamera,
  User,
  SignIn,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useVoiceCall } from "@/hooks/useVoiceCall"
import { SIGNALING_SERVER_URL } from "@/lib/config"

async function createMeeting(meetingId: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(`${SIGNALING_SERVER_URL}/api/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, password }),
    })
    return response.ok
  } catch {
    return false
  }
}

export default function VoiceCallPage() {
  const [meetingId, setMeetingId] = useState("")
  const [password, setPassword] = useState("")
  const [showCallView, setShowCallView] = useState(false)
  const [isHost, setIsHost] = useState(false)

  const { status, isMuted, toggleMute, joinCall, endCall } = useVoiceCall({
    signalingServerUrl: SIGNALING_SERVER_URL,
    onStatusChange: (newStatus) => {
      if (newStatus === "ended") {
        setShowCallView(false)
        setMeetingId("")
        setPassword("")
        setIsHost(false)
      }
    },
  })

  const handleStartCall = async () => {
    if (!meetingId.trim()) return
    setIsHost(true)
    setShowCallView(true)
    await createMeeting(meetingId, password)
    await joinCall(meetingId, password)
  }

  const handleJoinCall = async () => {
    if (!meetingId.trim()) return
    setIsHost(false)
    setShowCallView(true)
    await joinCall(meetingId, password)
  }

  const handleEndCall = () => {
    endCall()
    setShowCallView(false)
    setIsHost(false)
  }

  if (showCallView) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="size-5" />
              {meetingId}
            </CardTitle>
            <CardDescription>
              {isHost && "Waiting for someone to join..."}
              {!isHost && status === "connecting" && "Connecting..."}
              {!isHost && status === "connected" && "Connected"}
              {status === "ended" && "Call ended"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
              <User className="size-10 text-primary" />
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "default"}
                className="size-14 rounded-full"
                onClick={toggleMute}
                disabled={status !== "connected"}
              >
                {isMuted ? (
                  <MicrophoneSlash className="size-6" data-icon="inline" />
                ) : (
                  <Microphone className="size-6" data-icon="inline" />
                )}
              </Button>

              <Button
                size="lg"
                variant="destructive"
                className="size-14 rounded-full"
                onClick={handleEndCall}
                disabled={status === "ended"}
              >
                <PhoneDisconnect className="size-6 rotate-[135deg]" data-icon="inline" />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                id="video-toggle"
                checked={false}
                onCheckedChange={() => {}}
                disabled
              />
              <label htmlFor="video-toggle" className="cursor-not-allowed opacity-50">
                Video disabled
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoCamera className="size-5" />
            Voice Call
          </CardTitle>
          <CardDescription>Enter meeting details to start or join a call</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="meeting-id" className="text-sm font-medium">
                Meeting ID
              </label>
              <Input
                id="meeting-id"
                type="text"
                placeholder="Enter meeting ID"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                className="flex-1"
                onClick={handleStartCall}
                disabled={!meetingId.trim() || status === "connecting"}
              >
                <VideoCamera className="size-4" data-icon="inline-start" />
                Start Call
              </Button>

              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleJoinCall}
                disabled={!meetingId.trim() || status === "connecting"}
              >
                <SignIn className="size-4" data-icon="inline-start" />
                Join Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
