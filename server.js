//#!/usr/bin/env node
var WebSocketServer = require('websocket').server;
var fs = require('fs');
var path = require('path');
var http = require('http');
var protocol = 'euhhh-protocol';
var startPulse = null;
var connections = [];
var defaultMessage = "eu";
var broadcastMessage = defaultMessage;

var server = http.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	var filePath = '.' + request.url;
	if (filePath == './')
		filePath = './index.htm';

	var extname = path.extname(filePath);
	var contentType = 'text/html';
	switch (extname) {
		case '.js':
			contentType = 'text/javascript';
			break;
		case '.css':
			contentType = 'text/css';
			break;
	}

	fs.exists(filePath, function(exists) {
		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					response.writeHead(500);
					response.end();
				} else {
					response.writeHead(200, {
						'Content-Type' : contentType
					});
					response.end(content, 'utf-8');
				}
			});
		} else {
			response.writeHead(404);
			response.end();
		}
	});
});

server.listen(8080, function() {
	console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
	httpServer : server,
	autoAcceptConnections : false
});

wsServer.on('request', function(request) {

	if (request.requestedProtocols.indexOf(protocol) === -1) {
		console.log((new Date()) + ' Connection rejected');
		return;
	}
	var connection = request.accept(protocol, request.origin);
	connections.push(connection);

	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', function(message) {
		if (message.type === 'utf8') {

			try {
				console.log(message.utf8Data);
				var packet = JSON.parse(message.utf8Data);

				switch(packet.command) {
					case 'update':
						lastPulse = new Date(new Date() + 300);
						broadcastMessage += 'h';
						broadcast(JSON.stringify({
							"type" : "text",
							"message" : broadcastMessage
						}));
						break;
					case 'shut':
						if (lastPulse < new Date()) {
							broadcast(JSON.stringify({
								"type" : "break",
								"message" : defaultMessage
							}));
							broadcastMessage = defaultMessage;
						}
						break;
				}
			} catch(e) {
				console.log("Error: " + e)
			}
		}
	});
	connection.on('close', function(reasonCode, description) {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		var index = connections.indexOf(connection);
		if (index !== -1) {
			connections.splice(index, 1);
		}
	});
});

function broadcast(message) {
	connections.forEach(function(destination) {
		destination.sendUTF(message);
	});
}