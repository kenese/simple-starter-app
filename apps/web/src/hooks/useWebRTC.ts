import { useEffect, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type {
  SocketClientEvents,
  SocketServerEvents,
  SDPPayload,
  ICEPayload,
} from "@starter/shared";
import { useCanvasStore } from "../store/appStore";

type TypedSocket = Socket<SocketServerEvents, SocketClientEvents>;

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const BROADCAST_INTERVAL_MS = 50;

interface PeerState {
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null;
}

export function useWebRTC(
  documentId: string | null,
  socketRef: React.MutableRefObject<TypedSocket | null>
) {
  const userId = useCanvasStore((s) => s.userId);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const lastBroadcastRef = useRef(0);
  const trailingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closePeer = useCallback((remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    if (peer) {
      peer.channel?.close();
      peer.pc.close();
      peersRef.current.delete(remoteUserId);
    }
    useCanvasStore.getState().removeRemoteCursor(remoteUserId);
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const id of peersRef.current.keys()) {
      const peer = peersRef.current.get(id);
      if (peer) {
        peer.channel?.close();
        peer.pc.close();
      }
    }
    peersRef.current.clear();
    useCanvasStore.getState().clearRemoteCursors();
  }, []);

  const handleDataMessage = useCallback(
    (remoteUserId: string, event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "cursor") {
          useCanvasStore
            .getState()
            .setRemoteCursor(remoteUserId, data.x, data.y);
        }
      } catch {
        /* ignore malformed messages */
      }
    },
    []
  );

  const setupChannel = useCallback(
    (remoteUserId: string, channel: RTCDataChannel) => {
      const peer = peersRef.current.get(remoteUserId);
      if (peer) peer.channel = channel;
      channel.onmessage = (e) => handleDataMessage(remoteUserId, e);
      channel.onclose = () => {
        useCanvasStore.getState().removeRemoteCursor(remoteUserId);
      };
    },
    [handleDataMessage]
  );

  const createPeer = useCallback(
    async (
      remoteUserId: string,
      isInitiator: boolean,
      remoteOffer?: SDPPayload
    ) => {
      const socket = socketRef.current;
      if (!socket) return;

      closePeer(remoteUserId);

      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        const peerState: PeerState = { pc, channel: null };
        peersRef.current.set(remoteUserId, peerState);

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc-ice-candidate", {
              targetUserId: remoteUserId,
              candidate: e.candidate.toJSON() as ICEPayload,
            });
          }
        };

        if (isInitiator) {
          const channel = pc.createDataChannel("cursors");
          setupChannel(remoteUserId, channel);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", {
            targetUserId: remoteUserId,
            offer: { type: offer.type!, sdp: offer.sdp } as SDPPayload,
          });
        } else if (remoteOffer) {
          pc.ondatachannel = (e) => {
            setupChannel(remoteUserId, e.channel);
          };

          await pc.setRemoteDescription(
            remoteOffer as RTCSessionDescriptionInit
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc-answer", {
            targetUserId: remoteUserId,
            answer: { type: answer.type!, sdp: answer.sdp } as SDPPayload,
          });
        }
      } catch (err) {
        console.error("[useWebRTC] createPeer failed:", err);
      }
    },
    [socketRef, closePeer, setupChannel]
  );

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !documentId) return;

    const onUserJoined = ({ userId: remoteId }: { userId: string }) => {
      if (remoteId !== userId) createPeer(remoteId, true);
    };

    const onOffer = ({
      fromUserId,
      offer,
    }: {
      fromUserId: string;
      offer: SDPPayload;
    }) => {
      createPeer(fromUserId, false, offer);
    };

    const onAnswer = ({
      fromUserId,
      answer,
    }: {
      fromUserId: string;
      answer: SDPPayload;
    }) => {
      const peer = peersRef.current.get(fromUserId);
      if (peer) {
        peer.pc.setRemoteDescription(answer as RTCSessionDescriptionInit);
      }
    };

    const onIce = ({
      fromUserId,
      candidate,
    }: {
      fromUserId: string;
      candidate: ICEPayload;
    }) => {
      const peer = peersRef.current.get(fromUserId);
      if (peer) {
        peer.pc.addIceCandidate(candidate as RTCIceCandidateInit);
      }
    };

    const onUserLeft = ({ userId: remoteId }: { userId: string }) => {
      closePeer(remoteId);
    };

    socket.on("user-joined", onUserJoined);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIce);
    socket.on("user-left", onUserLeft);

    return () => {
      socket.off("user-joined", onUserJoined);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIce);
      socket.off("user-left", onUserLeft);
      closeAllPeers();
    };
  }, [documentId, userId, socketRef, createPeer, closePeer, closeAllPeers]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();

    const send = () => {
      const msg = JSON.stringify({ type: "cursor", x, y });
      for (const peer of peersRef.current.values()) {
        if (peer.channel?.readyState === "open") {
          peer.channel.send(msg);
        }
      }
    };

    if (trailingRef.current) {
      clearTimeout(trailingRef.current);
      trailingRef.current = null;
    }

    if (now - lastBroadcastRef.current >= BROADCAST_INTERVAL_MS) {
      lastBroadcastRef.current = now;
      send();
    } else {
      trailingRef.current = setTimeout(() => {
        lastBroadcastRef.current = Date.now();
        trailingRef.current = null;
        send();
      }, BROADCAST_INTERVAL_MS - (now - lastBroadcastRef.current));
    }
  }, []);

  return { broadcastCursor };
}
