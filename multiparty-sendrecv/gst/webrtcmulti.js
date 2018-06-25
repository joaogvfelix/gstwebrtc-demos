/* vim: set sts=4 sw=4 et :
 *
 * Demo Javascript app for negotiating and streaming a sendrecv webrtc stream
 * with a GStreamer app. Runs only in passive mode, i.e., responds to offers
 * with answers, exchanges ICE candidates, and streams.
 *
 * Author: Nirbheek Chauhan <nirbheek@centricular.com>
 */

// Set this to override the automatic detection in websocketServerConnect()
var ws_server;
var ws_port;
var peer_list = []

var ROOM_ID=12;
// Set this to use a specific peer id instead of a random one
var default_peer_id;
// Override with your own STUN servers if you want
var rtc_configuration = {iceServers: [{urls: "stun:stun.services.mozilla.com"},
                                      {urls: "stun:stun.l.google.com:19302"}]};
// The default constraints that will be attempted. Can be overriden by the user.
var default_constraints = {video: false, audio: true};

var connect_attempts = 0;
var peer_connection;
var ws_conn;
// Promise for local stream after constraints are approved by the user
var local_stream_promise;
//var local_stream_promise;

function getOurId() {
    return Math.floor(Math.random() * (9000 - 10) + 10).toString();
}

function resetState() {
    // This will call onServerClose()
    ws_conn.close();
}

function handleIncomingError(error) {
    setError("ERROR: " + error);
    resetState();
}

function getVideoElement() {
    return document.getElementById("stream");
}

function setStatus(text) {
    console.log(text);
    var span = document.getElementById("status")
    // Don't set the status if it already contains an error
    if (!span.classList.contains('error'))
        span.textContent = text;
}

function setError(text) {
    console.error(text);
    var span = document.getElementById("status")
    span.textContent = text;
    span.classList.add('error');
}

function resetVideo() {
    // Release the webcam and mic
    if (local_stream_promise)
        local_stream_promise.then(stream => { stream.stop(); });

    // Reset the video element and stop showing the last received frame
    var videoElement = getVideoElement();
    videoElement.pause();
    videoElement.src = "";
    videoElement.load();
}

// SDP offer received from peer, set remote description and create an answer
function onIncomingSDP(sdp) {

    peer_connection.setRemoteDescription(sdp).then(() => {
        setStatus("Remote SDP set");
        
        if (sdp.type != "offer")
            return;
        setStatus("Got SDP offer");
        local_stream_promise.then((stream) => {
            setStatus("Got local stream, creating answer");
                        
            peer_connection.createAnswer()
            .then(onLocalDescription).catch(setError);
        }).catch(setError);
    }).catch(setError);
}




// Local description was set, send it to peer
function onLocalDescription(desc) {
    console.log("Got local description: " + JSON.stringify(desc));
    peer_connection.setLocalDescription(desc).then(function() {
        setStatus("Sending SDP answer ");
                console.log("Sending SDP answer "+peer_list);
        sdp = {'sdp': peer_connection.localDescription}
        for (peer in peer_list){
				console.log("send SDP" + peer_list[peer]+ " " + JSON.stringify(sdp));
				ws_conn.send('ROOM_PEER_MSG ' +peer_list[peer] + " " + JSON.stringify(sdp));
        
		}
			
        //console.log('ROOM_PEER_MSG ' +peer_id + " " + JSON.stringify(sdp));
    });
}


// ICE candidate received from peer, add it to the peer connection
function onIncomingICE(ice) {
    var candidate = new RTCIceCandidate(ice);
    
    peer_connection.addIceCandidate(candidate).catch(setError);
    console.log("esta a fazer o addicecandidade" + JSON.stringify(ice));
    
}


function onServerMessage(event) {
	

    console.log("Received " + event.data);
    
    if (event.data.startsWith("HELLO")) {
		setStatus("Registered with server, waiting for call");
		return;
    }
	if (event.data.startsWith("ROOM_OK ")) {
	
		console.log("ROOM_ok bem recebido "+event.data);
		pessoas = event.data;
		peer_list = pessoas.split(' ').slice(1);
		console.log("PEERS IN LIST " + peer_list);
		
		//createCallRoom();
		//fazer split e saber quem chegou
		
		
		
		console.log("ROOM_ok bem recebido "+event.data);

		peer_connection = new RTCPeerConnection(rtc_configuration);
		
		
		peer_connection.ontrack = onRemoteStreamAdded;
		console.log('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
		local_stream_promise = getLocalStream().then((stream) => {
			
			console.log('Adding local stream');
			peer_connection.addStream(stream);
			return stream;
		}).catch(setError);
		setStatus("XXXXXXXXXXXXXXXXX");
		local_stream_promise.then((stream) => {
			console.log('Adding local stream');
				
			setStatus("Got local stream, creating answer");
			peer_connection.createOffer().then(onLocalDescription).catch(setError);
			
		}).catch(setError);


			
		peer_connection.onicecandidate = (event) => {
			// We have a candidate, send it to the remote party with the
			// same uuid
			
			if (event.candidate == null) {
				console.log("ICE Candidate was null, done");
				return;
			}
		 
			for (peer in peer_list){
				console.log("send ICE " + peer_list[peer]);
				ws_conn.send('ROOM_PEER_MSG ' +peer_list[peer] + " " + JSON.stringify({'ice': event.candidate}));
			}
		};
	

				setStatus("Created peer connection for call, waiting for SDP");
				
				
			//msg = JSON.parse(event.data);
	//	peer_connection.setRemoteDescription().then(() => {
	//	peer_connection.ontrack = onRemoteStreamAdded;
//console.log("CARaLAHO");
					
	// })
		 // ws_conn.send('ROOM_PEER_MSG '+ peer_id + " " + peer_connection.createOffer().then(onLocalDescription).catch(setError))
		 return;
		
		
		
		
	}	 
	
	if (event.data.startsWith("ROOM_PEER_JOINED")) {
		//adicionar peer a lista
		console.log("ROOM_PEER_JOINED "+event.data);
		return;
	}
	if (event.data.startsWith("ROOM_PEER_LEFT ")) {
		console.log("ROOM_PEER_LEFT bem recebido "+event.data);
		//fazer spli remover peer da lista
		return;
	} 
	if (event.data.startsWith("ROOM_PEER_MSG ")) {
		var data = event.data.split(" ");
		//var datateste=event.data;
		
		//var index = datateste.indexOf(":{");
		//var text = datateste.substr(index + 1);
		//var mais = text.substr(0, text.length -1);
		//var candidate = new RTCIceCandidate(mais);
		//peer_connection.addIceCandidate(candidade).catch(setError);
		//console.log("CArrrra " + mais);
		
		console.log("ROOM_PEER_MSG from "+data[1]);

		data = data.slice(2).join(" ");

		try {
			msg = JSON.parse(data);
		} catch (e) {
			if (e instanceof SyntaxError) {
				handleIncomingError("Error parsing incoming JSON: " + data);
			} else {
				handleIncomingError("Unknown error parsing response: " + data);
			}
			return;
		}

	//	console.log("ROOM_PEER_MSG JSON OK");
	//	console.log("JSON :" + data);

		if (!peer_connection)
		
			createCall(msg);
                
		if (msg.sdp) {
		peer_connection.setRemoteDescription(new RTCSessionDescription(msg.sdp)).then(() => {
		peer_connection.ontrack = onRemoteStreamAdded;
		console.log("testaristo");
					
	 })
		
			onIncomingSDP(msg.sdp);
		} else 
			if (msg.ice != null) {
			onIncomingICE(msg.ice);
		} else {
			handleIncomingError("Unknown incoming JSON: " + msg);
		}
    
    
  
    
    
    
	}
	return;
    

}

function onServerMessageOld(event) {
    console.log("Received " + event.data);
    switch (event.data) {
     
        default:
			if (event.data.startsWith("ROOM_OK ")) {
				console.log("ROOM_ok bem recebido "+event.data);
				pessoas = event.data;
				console.log("TESTE" + pessoas);

				peer_connection = new RTCPeerConnection(rtc_configuration);
				
				
				local_stream_promise = getLocalStream().then((stream) => {
					console.log('Adding local stream');
					peer_connection.addStream(stream);
					return stream;
					
				}).catch(setError);
				setStatus("XXXXXXXXXXXXXXXXX");
				local_stream_promise.then((stream) => {
					setStatus("Got local stream, creating answer");
					peer_connection.createOffer().then(onLocalDescription).catch(setError);
				}).catch(setError);

					
				peer_connection.onicecandidate = (event) => {
					// We have a candidate, send it to the remote party with the
					// same uuid
					if (event.candidate == null) {
						console.log("ICE Candidate was null, done");
						return;
					}
					console.log("SDDDDDDDDDDDDDDDD");
					ws_conn.send('ROOM_PEER_MSG ' +peer_id + " " + JSON.stringify({'ice': event.candidate}));
				};

				setStatus("Created peer connection for call, waiting for SDP");
							
				// peer_connection.setRemoteDescription().then(() => {
        
 
							
					
                 // ws_conn.send('ROOM_PEER_MSG '+ peer_id + " " + peer_connection.createOffer().then(onLocalDescription).catch(setError))
                 return;
				}//
            if (event.data.startsWith("ROOM_PEER_LEFT ")) {
                    console.log("ROOM_PEER_LEFT bem recebido "+event.data);
                    return;
            }
             if (event.data.startsWith("ROOM_PEER_MSG ")) {
				 var data = event.data.split(" ");
				    console.log("ROOM_PEER_MSGssss "+data[0]);
				    console.log("ROOM_PEER_MSGsss "+data[1]);
				    console.log("ROOM_PEER_MSGssss "+data[2]);
					return ;
				}
            
            if (event.data.startsWith("ERROR")) {
                handleIncomingError(event.data);
                return;
            }
            if (event.data.startsWith("ROOM_PEER_JOINED")) {
                console.log("ROOM_PEER_JOINED "+event.data);
                return;
            }

             if (event.data.startsWith("ROOM_PEER_MSG")) {
                console.log("ROOM_PEER_MSGsssss "+event.data);
                
                return;
            }
            console.log("OTHER DATA "+event.data);
            // Handle incoming JSON SDP and ICE messages
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    handleIncomingError("Error parsing incoming JSON: " + event.data);
                } else {
                    handleIncomingError("Unknown error parsing response: " + event.data);
                }
                return;
            }
            // Incoming JSON signals the beginning of a call
            if (!peer_connection)
                createCall(msg);
                

            if (msg.sdp != null) {
				console.log("LLLLLLLLLLLLOLLLLL");
                onIncomingSDP(msg.sdp);
            } else if (msg.ice != null) {
                onIncomingICE(msg.ice);
            } else {
                handleIncomingError("Unknown incoming JSON: " + msg);
            }
    }
}

function onServerClose(event) {
    setStatus('Disconnected from server');
    resetVideo();

    if (peer_connection) {
        peer_connection.close();
        peer_connection = null;
    }

    // Reset after a second
    window.setTimeout(websocketServerConnect, 1000);
}

function onServerError(event) {
    setError("Unable to connect to server, did you add an exception for the certificate?")
    // Retry after 3 seconds
    window.setTimeout(websocketServerConnect, 3000);
}

function getLocalStream() {
    var constraints;
    var textarea = document.getElementById('constraints');
    try {
        constraints = JSON.parse(textarea.value);
    } catch (e) {
        console.error(e);
        setError('ERROR parsing constraints: ' + e.message + ', using default constraints');
        constraints = default_constraints;
    }
    console.log(JSON.stringify(constraints));

    // Add local stream
    if (navigator.mediaDevices.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
    } else {
        errorUserMediaHandler();
    }
}

function websocketServerConnect() {
    connect_attempts++;
    if (connect_attempts > 3) {
        setError("Too many connection attempts, aborting. Refresh page to try again");
        return;
    }
    // Clear errors in the status span
    var span = document.getElementById("status");
    span.classList.remove('error');
    span.textContent = '';
    // Populate constraints
    var textarea = document.getElementById('constraints');
    if (textarea.value == '')
        textarea.value = JSON.stringify(default_constraints);
    // Fetch the peer id to use
    peer_id = default_peer_id || getOurId();
     
    ws_port = ws_port || '8443';
    if (window.location.protocol.startsWith ("file")) {
        ws_server = ws_server || "127.0.0.1";
    } else if (window.location.protocol.startsWith ("http")) {
        ws_server = ws_server || window.location.hostname;
    } else {
        throw new Error ("Don't know how to connect to the signalling server with uri" + window.location);
    }
    var ws_url = 'wss://' + ws_server + ':' + ws_port
    setStatus("Connecting to server " + ws_url);
    ws_conn = new WebSocket(ws_url);
    /* When connected, immediately register with the server */
    ws_conn.addEventListener('open', (event) => {
        document.getElementById("peer-id").textContent = peer_id;
       
        
    ws_conn.send('HELLO ' + peer_id);
    ws_conn.send('ROOM '+ ROOM_ID);
        
        setStatus("Registering with server");
    });https://github.com/centricular/gstwebrtc-demos/blob/master/sendrecv

    ws_conn.addEventListener('error', onServerError);
    ws_conn.addEventListener('message', onServerMessage);
    ws_conn.addEventListener('close', onServerClose);
}

function onRemoteStreamAdded() {
	console.log("TESTETESTE");
    videoTracks = event.stream.getVideoTracks();
    audioTracks = event.stream.getAudioTracks();

    if (videoTracks.length > 0) {
        console.log('Incoming stream: ' + videoTracks.length + ' video tracks and ' + audioTracks.length + ' audio tracks');
        getVideoElement().srcObject = event.stream;
    } else {
        handleIncomingError('Stream with unknown tracks added, resetting');
    }
}

function errorUserMediaHandler() {
    setError("Browser doesn't support getUserMedia!");
}

function createCall(msg) {
    // Reset connection attempts because we connected successfully
    connect_attempts = 0;

    console.log('Creating RTCPeerConnection');

    peer_connection = new RTCPeerConnection(rtc_configuration);
    peer_connection.onaddstream = onRemoteStreamAdded;
    /* Send our video/audio to the other peer */
    local_stream_promise = getLocalStream().then((stream) => {
        console.log('Adding local stream');
        peer_connection.addStream(stream);
        return stream;
    }).catch(setError);

    if (!msg.sdp) {
        console.log("WARNING: First message wasn't an SDP message!?");
    }

    peer_connection.onicecandidate = (event) => {
	// We have a candidate, send it to the remote party with the
	// same uuid
	if (event.candidate == null) {
            console.log("ICE Candidate was null, done");
            return;
	}
	ws_conn.send(JSON.stringify({'ice': event.candidate}));
    };

    setStatus("Created peer connection for call, waiting for SDP");
}
