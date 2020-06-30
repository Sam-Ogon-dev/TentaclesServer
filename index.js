let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

let friendsList = new Map();
let correspondenceList = new Map();

app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', ['*']);
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    next();
});



io.on('connection', socket => {

    //ONLINE
    socket.on("online", ({name, mySocket}) => {
        console.log("Подключился: " + name + " " + mySocket);
        friendsList.set(name, mySocket);

        //FRIENDS-LIST
        io.emit("friendsList", Object.fromEntries(friendsList));
    });

    //MESSAGE
    socket.on("message", ({sender, msg, companion}) => {
        let companionID = friendsList.get(companion);
        let currentCorrespondence = () => correspondenceList.get(sender+companion) || correspondenceList.get(companion+sender);

        //PUSH NEW MESSAGE
        currentCorrespondence()[1].push([sender, msg]);

        //IF ONE OF THE FLAGS IS "FALSE", THEN SEND MESSAGE TO ONLY SENDER
        if(currentCorrespondence()[0].includes(false)){
            socket.emit("correspondenceResponse", currentCorrespondence()[1]);
        }else {

            //IF BOTH FLAGS IS "TRUE", THEN SEND MESSAGE TO BOTH INTERLOCUTOR
            //CORRESPONDENCE-RESPONSE
            socket.join(companionID);
            io.to(companionID).emit("correspondenceResponse", currentCorrespondence()[1]);
            socket.leave(companion);
        }
    });

    //CORRESPONDENCE-GET
    socket.on("correspondenceGET", ({sender, companion}) => {
        let currentCorrespondence = correspondenceList.get(sender+companion) || correspondenceList.get(companion+sender);

        //CORRESPONDENCE-RESPONSE
        if(currentCorrespondence) {

            //SET FLAG TO "TRUE"
            currentCorrespondence[0].forEach((item, index) => {
                if(item === false) { currentCorrespondence[0][index] = true }
            });
            socket.emit("correspondenceResponse", currentCorrespondence[1] || []);

        //IF CORRESPONDENCE NOT EXIST, THEN CREATE NEW CORRESPONDENCE
        //FLAGS "TRUE" AND "FALSE" INDICATE SOCKET'S READINESS
        }else {
            correspondenceList.set(sender+companion, [[true, false], []]);
        }
    });

    socket.on("disconnect", () => {
        for(let elem of friendsList) {
            if(socket.id === elem[1]) {
                console.log(elem[0] + " отключился");
                friendsList.delete(elem[0]);
            }
        }
        console.log("В сети: ");
        for (let elem of friendsList) {
            console.log(elem);
        }
    });
});



http.listen(3001, () => console.log("server is run..."));

