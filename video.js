const socket = io("https://ochat-video-backend.onrender.com");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const nextBtn = document.getElementById("nextBtn");

let localStream;
let remoteStream;
let peerConnection;
let currentPeerId = null;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

async function startLocalVideo() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        to: currentPeerId,
        candidate: event.candidate
      });
    }
  };
}

nextBtn.onclick = () => {
  socket.emit("join-video");
};

socket.on("connect", () => {
  console.log("Connected to socket server");
  socket.emit("join-video");
});

socket.on("match-found", async ({ peerId, initiator }) => {
  currentPeerId = peerId;
  createPeerConnection();

  if (initiator) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", { to: peerId, offer });
  }
});

socket.on("offer", async ({ from, offer }) => {
  currentPeerId = from;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", { to: from, answer });
});

socket.on("answer", async ({ from, answer }) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async ({ candidate }) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Error adding ICE candidate:", err);
  }
});

startLocalVideo();
