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
    res.append("SameSite", "None; Secure");
    next();
}, express.json({limit: "50mb"}), cookerParser());


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
    db.getAvatar(request.query.avatar).then(r => {
        if (r.default) {
            response.set("Content-Type", "image/png");
            response.send(r.image);
        } else {
            response.set("Content-Type", "image/jpeg");
            response.send(r.image);
        }
    });
});

//GET NEWS
app.get("/getNews", (request, response) => {
   db.getNews().then(r => {
       response.send(r);
   })
});

//AUTHENTICATIONS
app.post("/auth", (request, response) => {
    db.auth(request.body.user_name, request.body.password).then(r => {
        if(!r.error) {
            response.cookie("user_name", request.body.user_name);
            response.cookie("password", request.body.password);
            response.cookie("id", r.id);
            response.cookie("auth", true);
            response.cookie("favourites", r.favourites);
        }
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
    db.changeAvatar(request.body).then(() => {
        response.send("done");
    });
})

//CREATE POST
app.post("/createPost", (request, response) => {
    db.createPost(request.body).then(() => {
        response.send("done");
    });
});

//CHANGE NAME/PASSWORD
app.put("/changeNamePassword", (request, response) => {
    db.changeNamePassword(request.body).then(r => {
        if(!r.err) {
            response.cookie("user_name", r.user_name);
            response.cookie("password", r.password);
            response.cookie("id", r.id);
            response.cookie("auth", true);
        }
        response.send(r);
    });
})

//ADD FAVOURITES
app.put("/changeFavourites", (request, response) => {
    db.changeFavourites(request.body);
    response.send("done");
})


io.on('connection', socket => {

    //ONLINE
    socket.on("online", ({user_name, mySocket}) => {
        if(!user_name) return;
        console.log("Подключился: " + user_name + " " + mySocket);
        serverLogic.onlineList.set(user_name, mySocket);
        console.log(serverLogic.onlineList);

        //  ONLINE/FRIEND_LIST
        db.getFriendsList().then(r => {
            io.emit("ONLINE/FRIEND_LIST", {
                online: [...serverLogic.onlineList.keys()],
                friends: r
            });
        });

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

    socket.on("changeStatus", ({correspondenceID}) => {
        serverLogic.setStatus(false, correspondenceID);
    });



    socket.on("disconnect", () => {
        serverLogic.disconnect(socket);
        io.emit("onlineList", [...serverLogic.onlineList.keys()]);
    });

    socket.on("exit", () => {
        serverLogic.disconnect(socket);
        io.emit("onlineList", [...serverLogic.onlineList.keys()]);
    });
});



http.listen(3001, () => console.log("server is run..."));


