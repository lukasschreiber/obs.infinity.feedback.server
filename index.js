var express = require('express');
var http = require('http');
var WebSocket = require('ws');
var mysql = require('mysql');

require('dotenv').config()

var connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

connection.connect();


const app = express();

const port = process.env.APP_PORT || 3000;
const host = process.env.APP_HOST;

const server = http.createServer(app)
const wss = new WebSocket.Server({ server });



//handle Web Frontend
app.get('/', function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.send('<html><head><title>Server</title></head><body><span style="font-family: \'Lucida Console\'; text-align:center; margin-top:40%;">Server only suitable for WS Requests</span></body></html>');
});

app.get('/get/jsonp', function(request, response){
    var key = request.query.key;
    if (key) {
        connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + key + "' LIMIT 1", (error, results, fields) => {
            if (error) response.send(error)
            var id = results[0].id;
            getUpdatedData([], null, id, (json)=>{
                response.jsonp(json)
            })
        })
    }
})

app.options('/get', function(req, res) {
    console.log("options");
})

app.get('/get', function (request, response) {
    var key = request.query.key;
    if (key) {
        connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + key + "' LIMIT 1", (error, results, fields) => {
            if (error) response.send(error)
            var id = results[0].id;
            getUpdatedData([], null, id, (json)=>{
                response.json(json)
            })
        })
    }
})

app.get('/message', function(request, response){
    if(request.query.key){
        json = {message: request.query.message, reference: request.query.reference}
        broadcastUpdate(json, request.query.key, response)
    }
})

app.get('/message/jsonp', function(request, response){
    if(request.query.key){
        json = {message: request.query.message, reference: request.query.reference}
        broadcastUpdate(json, request.query.key, response, true)
    }
})

app.get('/update', function (request, response) {
    var query = request.query
    if (query.key) {
        connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + query.key + "' LIMIT 1", (error, results, fields) => {
            if (error) response.send(error)
            var id = results[0].id;
            var scenes = []
            var stream = null

            if (query.all != null && query.active != null && query.preview != null) {

                var all = query.all.split(',')
                connection.query("DELETE FROM church_scenes WHERE `key_id`='" + id + "'")

                all.forEach(scene => {
                    var status = 0
                    if (scene === query.active) {
                        status = 1
                    }

                    if (scene === query.preview) {
                        status = 2
                    }

                    scenes.push({ name: scene, status: status })

                    connection.query("INSERT INTO church_scenes (`name`, `key_id`, `active`) VALUES ('" + scene + "', '" + id + "', '" + status + "')")
                });
            }

            if (query.stream !== null) {
                if(query.stream === true || query.stream === 'true'){
                    connection.query("INSERT INTO church_streams (`key_id`) VALUES ('"+id+"')")

                }else if(query.stream === false || query.stream === 'false'){
                    connection.query("DELETE FROM church_streams WHERE `key_id`='"+id+"'")
                    stream = { status: 'off', start: '' }

                }
            }

            getUpdatedData(scenes, stream, id, (json) => {
                broadcastUpdate(json, query.key, response);
            })

        })
    }
})

function getUpdatedData(scenes, stream, id, callback) {

    if (scenes.length == 0) {
        connection.query("SELECT `name`, `active` AS `status` FROM church_scenes WHERE `key_id` = '" + id + "'", (error, results, fields) => {
            scenes = results;

            if (stream == null) {
                connection.query("SELECT * FROM church_streams WHERE `key_id` = '" + id + "'", (error, results, fields) => {
                    stream = results;
                    if (stream.length == 0) {
                        stream = { status: 'off', start: '' }
                    } else {
                        stream = { status: 'live', start: Date.parse(results[0].start)}
                    }
                    callback({ stream: stream, scenes: { count: scenes.length, payload: scenes } });
                })
            } else {
                callback({ stream: stream, scenes: { count: scenes.length, payload: scenes } });
            }
        })
    } else {
        if (stream == null) {
            connection.query("SELECT * FROM church_streams WHERE `key_id` = '" + id + "'", (error, results, fields) => {
                stream = results;
                if (stream.length == 0) {
                    stream = { status: 'off', start: '' }
                } else {
                    stream = { status: 'live', start: Date.parse(results[0].start)}
                }
                callback({ stream: stream, scenes: { count: scenes.length, payload: scenes } });
            })
        } else {
            callback({ stream: stream, scenes: { count: scenes.length, payload: scenes } });
        }
    }

}



function broadcastUpdate(json, key, response, jsonp = false) {
    if(jsonp){
        response.jsonp(json)
    }else{
        response.json(json)
    }
    wss.broadcast(JSON.stringify(json), key)
}

server.listen(port, host, function () {
    console.log((new Date()) + ` Server is listening on port ${port}`);
});

var clients = []

//handle WS Conennctions
wss.on('connection', (ws, req) => {
    var key = new URL('https://localhost' + req.url).searchParams.get("key");

    try{
        clients.push({ client: ws, key: key })
        ws.on('message', (message) => {
    
            connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + key + "' LIMIT 1", (error, results, fields) => {
                if (error) response.send(error)
                var id = results[0].id;
                getUpdatedData([], null, id, (json) => {
                    ws.send(JSON.stringify(json))
                })
            })
        });
    
        //ws.send('Connected and subscribed to '+key);
        connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + key + "' LIMIT 1", (error, results, fields) => {
            if (error) response.send(error)
            var id = results[0].id;
            getUpdatedData([], null, id, (json) => {
                ws.send(JSON.stringify(json))
            })
        })
    }catch(e){
        console.log(e)
    }
   
});


wss.broadcast = function broadcast(msg, key = null) {
    console.log(msg);
    clients.forEach(function each(client) {
        if (key === null || client.key === key)
            client.client.send(msg);
    });
};

