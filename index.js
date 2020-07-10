const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cookerParser = require('cookie-parser');
const io = require('socket.io')(http);
const db = require('./DataBase')();
const serverLogic = require('./ServerLogic')();



app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', [req.headers.origin]);
    res.append('Access-Control-Allow-Credentials', 'true');
    res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.append('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Set-Cookie");
    next();
}, express.json(), cookerParser());


//GET CORRESPONDENCE
app.get("/correspondence", (request, response) => {
    let correspondenceID = request.query.correspondenceID;
    serverLogic.setStatus(true, correspondenceID);
    db.getCorrespondence(correspondenceID).then(r => response.send(r));
});

//GET FRIENDS LIST
app.get("/friends", (request, response) => {
    db.getFriendsList().then(r => response.send({friends: r, onlineList: [...serverLogic.onlineList.keys()]}));
})

//GET AVATAR
app.get("/user_files", (request, response) => {
   db.getAvatars(request, response);
});

//AUTHENTICATIONS
app.post("/auth", (request, response) => {
    db.auth(request.body.user_name, request.body.password).then(r => {
        response.cookie("user_name", request.body.user_name);
        response.cookie("password", request.body.password);
        response.cookie("id", r.id);
        response.cookie("auth", true);
        response.send(r);
    });
});

//REGISTRATION
app.post("/registration", (request, response) => {
    db.registration(request.body.user_name, request.body.password).then(r => {
        response.send(r);
    })
})

//CHANGE AVATAR
app.post("/changeAvatar", (request, response) => {
    db.changeAvatar(request.body.avatar);
    response.send("done");
})


io.on('connection', socket => {

    //ONLINE
    socket.on("online", ({user_name, mySocket}) => {
        console.log("Подключился: " + user_name + " " + mySocket);
        if(!user_name) return;
        serverLogic.onlineList.set(user_name, mySocket);
        console.log(serverLogic.onlineList);

        //ONLINE-LIST
        io.emit("onlineList", [...serverLogic.onlineList.keys()]);
    });

    //MESSAGE
    socket.on("message:NEW", ({msg, user_name, companion, correspondenceID, user_id}) => {
        let companionID = serverLogic.onlineList.get(companion);
        let currentCorrespondence = serverLogic.interlocutorsStatus.get(correspondenceID);

        db.pushMessage(correspondenceID, user_id, msg);

        //IF ONE OF THE FLAGS IS "FALSE", THEN SEND MESSAGE TO ONLY SENDER
        if(currentCorrespondence.includes(false)){
            socket.emit("message:GET", {id: user_id, user_name, message: msg});
        }else {

            //IF BOTH FLAGS IS "TRUE", THEN SEND MESSAGE TO BOTH INTERLOCUTOR
            socket.join(companionID);
            io.to(companionID).emit("message:GET", {id: user_id, user_name, message: msg});
            socket.leave(companion);
        }
    });

    socket.on("changeCompanion", ({correspondenceID}) => {
        serverLogic.setStatus(false, correspondenceID);
    });



    socket.on("disconnect", () => {
        serverLogic.disconnect(socket);
        io.emit("onlineList", [...serverLogic.onlineList.keys()]);
    });
});



http.listen(3001, () => console.log("server is run..."));


