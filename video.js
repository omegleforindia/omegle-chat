const socket = io();

// Setup STUN servers
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;

    socket.emit("join-video");

    socket.on("offer", (offer) => {
      peerConnection = createPeerConnection();
      peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      peerConnection.addStream(localStream);

      peerConnection.createAnswer().then(answer => {
        peerConnection.setLocalDescription(answer);
        socket.emit("answer", answer);
      });
    });

    socket.on("answer", (answer) => {
      peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", (candidate) => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
  });

socket.on("ready", () => {
  peerConnection = createPeerConnection();
  peerConnection.addStream(localStream);

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  });
});

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
