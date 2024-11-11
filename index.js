const http = require("http");
const express = require("express");
const websocketServer = require("websocket").server;

const app = express();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// Use Render's assigned port or default to 9090 if running locally
const PORT = process.env.PORT || 9090;
const httpServer = http.createServer(app);
httpServer.listen(PORT, () => console.log(`Listening on port ${PORT}`));

// Hashmap clients and games
const clients = {};
const games = {};

// WebSocket server setup
const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("Connection opened!"));
    connection.on("close", () => console.log("Connection closed!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);
        
        // Handle "create" method
        if (result.method === "create") {
            const clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            };

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            };

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        // Handle "join" method
        if (result.method === "join") {
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length >= 3) return; // Max players reached

            const color = {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length];
            game.clients.push({
                "clientId": clientId,
                "color": color
            });

            if (game.clients.length === 3) updateGameState();

            const payLoad = {
                "method": "join",
                "game": game
            };

            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad));
            });
        }

        // Handle "play" method
        if (result.method === "play") {
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;
            let state = games[gameId].state || {};
            state[ballId] = color;
            games[gameId].state = state;
        }
    });

    const clientId = guid();
    clients[clientId] = { "connection": connection };

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    };
    connection.send(JSON.stringify(payLoad));
});

function updateGameState() {
    for (const g of Object.keys(games)) {
        const game = games[g];
        const payLoad = {
            "method": "update",
            "game": game
        };

        game.clients.forEach(c => {
            clients[c.clientId].connection.send(JSON.stringify(payLoad));
        });
    }

    setTimeout(updateGameState, 500);
}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
