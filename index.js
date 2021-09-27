var express = require('express');
var http = require('http');
var WebSocket = require('ws');
var mysql = require('mysql');
const Discord = require("discord.js");
const config = require("./config.json");
const hello = require("./hello.json");
const commands = require("./commands.json");

// Discord Bot Section

const client = new Discord.Client();

client.login(config.BOT_TOKEN);


client.on('ready', () => {
    //.guild... test only?
    commands.forEach(command => {
        client.api.applications(client.user.id).commands.post({
            data: command
        });
    })
   

    client.ws.on('INTERACTION_CREATE', async interaction => {
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;

        if (command === 'hello'){ 
            const random = Math.floor(Math.random()*105)
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: args && args.find(p=>p.name === 'language') 
                        ? hello.find(p=>p.language === args.find(p=>p.name === 'language')?.value)?.hello+"! *"+args.find(p=>p.name === 'language')?.value+"*" 
                        : hello[random].hello+"! *"+hello[random].language+"*",
                        flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                    }
                }
            })
        }


        if(command === "time") {

            getKeyID(process.env.APP_KEY).then(id => {
                connection.query("SELECT * FROM church_streams WHERE `key_id` = '" + id + "'", (error, results, fields) => {
                    var stream = results;
                    var reply = "";
                    if (stream.length == 0) {
                        reply = "The stream is currently offline."
                    } else {
                        reply = "The stream is live since "+Date.parse(results[0].start)
                    }
                    
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: reply,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                })
            }).catch(error => console.log(error))
            
        }

        if(command === "scenes") {

            getKeyID(process.env.APP_KEY).then(id => {
                connection.query("SELECT `name`, `active` AS `status` FROM church_scenes WHERE `key_id` = '" + id + "'", (error, results, fields) => {
                    var scenes = results;
        
                    var scenesString = ""
                    for(var i = 0; i < scenes.length; i++){
                        if(i+1 < scenes.length)
                            scenesString += scenes[i].name+", "
                        else
                            scenesString += scenes[i].name
                    }
        
                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: "I found "+scenes.length+" scenes. Those are all Scenes, that are currently existing: "+scenesString,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                })
    
    
            }).catch(error => console.log(error))
          
        }

        if(command === "scene"){
            var reply = ""
            getKeyID(process.env.APP_KEY).then(id => {
                if(!args || !args.find(p=>p.name === 'scene')){
                    reply = "I could not find the scene you were looking for."

                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: reply,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                }

                var query = "SELECT `name`, `active` AS `status` FROM church_scenes WHERE `key_id` = '" + id + "' AND `name` = '"+mysql_real_escape_string(args.find(p=>p.name === 'scene')?.value)+"'"
                console.log(query)
                connection.query(query, (error, results, fields) => {
                    var scenes = results;
    
                    if(scenes == undefined || scenes.length <= 0){
                        reply = "I could not find the scene you were looking for."
                    }else{    
                        var statusText = ""
                        switch(scenes[0].status){
                            case 1: statusText = " is active."
                                break
                            case 2: statusText = " is loaded into preview."
                                break
                            default: statusText = " is neither loaded into preview, nor active in the stream." 
                                break
                        }
                        reply = "The scene \"" + scenes[0].name +"\""+ statusText
                    }

                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: reply,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                })
    
    
            }).catch(error => console.log(error))
        }


        if(command === "live"){
            var reply = ""
            getKeyID(process.env.APP_KEY).then(id => {
                var query = "SELECT `name`, `active` AS `status` FROM church_scenes WHERE `key_id` = '" + id + "' AND `active` = '"+'1'+"'"
                connection.query(query, (error, results, fields) => {
                    var scenes = results;
    
                    if(scenes == undefined || scenes.length <= 0){
                        reply = "I could not find any scene that is currently live."
                    }else{    
    
                        reply = "The scene \"**" + scenes[0].name +"**\""+ " is currently live :movie_camera:"
                    }

                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: reply,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                })
    
    
            }).catch(error => console.log(error))
        }


        
        if(command === "preview"){
            var reply = ""
            getKeyID(process.env.APP_KEY).then(id => {
                var query = "SELECT `name`, `active` AS `status` FROM church_scenes WHERE `key_id` = '" + id + "' AND `active` = '"+'2'+"'"
                connection.query(query, (error, results, fields) => {
                    var scenes = results;

                    if(scenes == undefined || scenes.length <= 0){
                        reply = "I could not find any scene that is currently loaded into preview."
                    }else{    

                        reply = "The scene \"**" + scenes[0].name +"**\""+ " is currently loaded into preview :desktop:"
                    }

                    client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 4,
                            data: {
                                content: reply,
                                flags: args && args.find(p=>p.name === 'scope')?.value === "everyone" ? 0 : 64 //ephemeral 64
                            }
                        }
                    })
                })


            }).catch(error => console.log(error))
        }

        if(command === "help"){
            var msg = "Hi, ich bin der InfinityFeedbackBot. :smile:\n\n"
            +"Ich leite Nachrichten in den #live Kanal weiter, die direkt in OBS verfasst wurden, und sende Updates in den #live Kanal, wenn in OBS die Szene gewechselt wird.\n"
            +"Ich kann zusätzlich über Slash-Befehle angesprochen werden:\n\n"
            +"**/help** den Help Befehl scheinst du ja schon zu kennen. Hier siehst du eine Übersicht aller Befehle, die ich beherrsche.\n\n"
            +"**/time** Hier erfährst du, ob der Stream gerade live ist, und wann er gestartet wurde.\n\n"
            +"**/ping** Der ping Befehl zeigt, wie schnell der Server im Moment erreichbar ist.\n\n"
            +"**/live** zeigt die Szene an, die im Moment live ist.\n\n"
            +"**/preview** zeigt die Szene an, die im Moment im preview ist.\n\n"
            +"**/scenes** listet alle Szenen auf, die zur Zeit in OBS vorhanden sind.\n\n"
            +"**/scene \"{scene_name}\"** hier erfährst du, ob eine Szene zur Zeit live ist oder im Preview. Achte auf die Anführungszeichen und passe auf Leerzeichen und Groß und Kleinschreibung auf. Beispiel: \`\`\`/scene \"Kamera 1\"\`\`\`\n"
            +"Diesen Helptext habe ich dir als DM geschickt, also kannst nur du ihn lesen. Alle anderen Antworten schicke ich direkt in den Kanal in dem du den Befehl ausgeführt hast. Wenn ich Discordupdates poste, sind diese nur für 10 Sekunden sichtbar. Falls du also vergessen haben solltest, ob deine Kamera gerade sichtbar ist, dann Frage mich doch einfach mit **/scene** oder **/live**. \n\n"
            +"Jetzt weisst du alles und bist bereit um los zu legen. :rocket:"
            
            client.api.interactions(interaction.id, interaction.token).callback.post({
                data: {
                    type: 4,
                    data: {
                        content: msg,
                        flags: 64 //ephemeral 64
                    }
                }
            })
        }
    

    });
});


//End Discord Bot Section


require('dotenv').config()

//Connect to DB
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


//give scenes to OBS Frontend
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
        broadcastToDiscord(request.query.message)
    }
})

app.get('/message/jsonp', function(request, response){
    if(request.query.key){
        json = {message: request.query.message, reference: request.query.reference}
        broadcastUpdate(json, request.query.key, response, true)
        broadcastToDiscord(request.query.message)
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
                var active = json.scenes.payload.filter(p => p.status == 1)[0].name
                var preview = json.scenes.payload.filter(p => p.status == 2)[0].name
                var msg = "The scene \"**"+active+"**\" is now live, \"_"+preview+"_\" has been loaded into preview. :red_circle:"
                broadcastToDiscord(msg, 10000)

                client.user.setActivity(active + " [> "+preview+"]", {
                    type: "PLAYING",
                });
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

function getKeyID(key){

    return new Promise(function(resolve, reject){
        connection.query("SELECT `id` FROM church_keys WHERE `key` = '" + key + "' LIMIT 1", (error, results, fields) => {
            if (results.length <= 0) reject()
    
            resolve(results[0].id)
        })
    })
   
}

function broadcastUpdate(json, key, response, jsonp = false) {
    if(jsonp){
        response.jsonp(json)
    }else{
        response.json(json)
    }
    wss.broadcast(JSON.stringify(json), key)
}


function broadcastToDiscord(message, deleteafter){
    client.channels.cache.get('856542573673185280').send(message).then(msg => {
        if(deleteafter !== undefined && deleteafter > 0){
            setTimeout(() => msg.delete(), deleteafter)
        }
    })
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

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}
