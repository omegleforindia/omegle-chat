const socket = io("https://ochat-video-backend.onrender.com"); // change this if hosted elsewhere

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
let localStream;
let peerConnection;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function init() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    socket.emit("join-video");

    socket.on("ready", () => {
      startCall();
    });

    socket.on("offer", async (offer) => {
      peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", async (answer) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("partner-disconnected", () => {
      if (peerConnection) peerConnection.close();
      peerConnection = null;
      remoteVideo.srcObject = null;
      alert("Your partner disconnected.");
    });

  } catch (err) {
    alert("Camera/Microphone permission needed.");
    console.error(err);
  }
}

function startCall() {
  peerConnection = createPeerConnection();
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  });
}

function createPeerConnection() {
  const pc = new RTCPeerConnection(config);
  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };
  return pc;
}

function nextPerson() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  socket.emit("join-video");
}

init();
