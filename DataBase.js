const mysql = require('mysql');
const fs = require('fs');


function MainDB () {

    this.connectBD = mysql.createConnection({
        database: "tentacles",
        host: "localhost",
        user: "root",
        password: "root"
    });

    this.connectBD.connect(err => {
        if (err) {throw err}
        console.log("connected to db...");
    })


    this.getFriendsList = async function() {

        return await new Promise(resolve => {
            this.connectBD.query(" SELECT id, user_name FROM users ", (err, values) => {
                resolve(values);
            });
        });
    }

    this.auth = async function (name, password) {
        return await new Promise(resolve => {
            this.connectBD.query(`SELECT user_name, id from users WHERE user_name="${name}" AND password="${password}"`,
                (err, values) => {
                resolve(values[0] ? values[0] : {error: "Ошибка аутентификации"})});
        })
    }

    this.registration = async function (name, password) {
        let isExist = await new Promise(resolve => {
            this.connectBD.query(`SELECT user_name, id from users WHERE user_name="${name}"`,
                (err, values) => {
                    resolve(values[0] ? true : false)});
        });

        if(isExist) {
            return {error: "Ошибка! Такой пользователь уже есть!"}
        }else {
            return await new Promise(resolve => {
                this.connectBD.query(`INSERT INTO users(user_name, password) VALUES ("${name}", "${password}")`,
                    (err, values) => {
                        resolve({notice: "Успешная регистрация!"});
                    });
            })
        }
    }

    this.pushMessage = function(correspondencesId, userName, message) {
        this.connectBD.query(`INSERT INTO correspondences(correspondences_id, user_name, message) VALUES ("${correspondencesId}", "${userName}", "${message}")`,
            (err, values) => console.log(err));
    }

    this.getCorrespondence = async function (correspondenceID) {
        return await new Promise((resolve => {
            this.connectBD.query(`SELECT users.id, users.user_name, correspondences.message 
                                      FROM tentacles.correspondences JOIN users ON correspondences.user_name = users.id 
                                      WHERE correspondences.correspondences_id = "${correspondenceID}"`,
                (err, values) => resolve(values));
        }));
    }

    this.getAvatars = function (request, response) {
        response.set("Content-Type", "image/jpeg");
        fs.readFile(`../user_files/avatars/${request.query.avatars}`, (err, image) => {

            if(err) {
                fs.readFile("../user_files/avatars/Logo.svg", (err, image) => {
                    response.set("Content-Type", "image/svg+xml");
                    response.send(image);
                });
            }else {
                response.send(image);
            }
        });
    }

    this.changeAvatar = function (file) {
        console.log(file)
        fs.writeFile("./test.txt", file, err => {
            if(err) console.log(err)
        })
    }
}

module.exports = function () {
    return new MainDB();
}








