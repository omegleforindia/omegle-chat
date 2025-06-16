const socket = io();

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;

async function init() {
  try {
    console.log("Requesting camera...");
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    socket.emit("join-video");

    socket.on("ready", () => {
      console.log("Ready to call");
      startCall();
    });

    socket.on("offer", async (offer) => {
      console.log("Received offer");
      peerConnection = createPeerConnection();
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("answer", answer);
    });

    socket.on("answer", async (answer) => {
      console.log("Received answer");
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", (candidate) => {
      console.log("Received candidate");
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

  } catch (err) {
    alert("⚠️ Camera/Microphone access denied or failed.\nCheck site permissions and try again.");
    console.error("getUserMedia error:", err);
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
    console.log("Remote stream received");
    remoteVideo.srcObject = event.streams[0];
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };

  return pc;
}

init(); // 👈 Start everything
function nextPerson() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  socket.emit("join-video");
}
