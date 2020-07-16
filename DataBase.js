const mysql = require('mysql');
const fs = require('fs');


function MainDB () {

    //////CONNECT DATABASE//////
    let connectBD = mysql.createConnection({
        database: "tentacles",
        host: "localhost",
        user: "root",
        password: "root"
    });

    connectBD.connect(err => {
        if (err) {throw err}
        console.log("connected to db...");
    })
    ////////////////////////////



    //GET FRIEND LIST
    this.getFriendsList = async function() {

        return await new Promise(resolve => {
            connectBD.query(" SELECT id, user_name FROM users ", (err, values) => {
                resolve(values);
            });
        });
    }


    //AUTH
    this.auth = async function (name, password) {
        return await new Promise(resolve => {
            connectBD.query(`SELECT user_name, id, favourites from users WHERE user_name="${name}" AND password="${password}"`,
                (err, values) => {
                resolve(values[0] ? values[0] : {error: "Ошибка аутентификации"})});
        })
    }


    //REGISTRATION
    this.registration = async function (name, password) {
        let isUnique = await new Promise(resolve => {
            connectBD.query(`SELECT user_name, id from users WHERE user_name="${name}"`,
                (err, values) => {
                    resolve(values[0] ? true : false)});
        });

        if(isUnique) {
            return {error: "Ошибка! Такой пользователь уже есть!"}
        }else {
            return await new Promise(resolve => {
                connectBD.query(`INSERT INTO users(user_name, password) VALUES ("${name}", "${password}")`,
                    (err, values) => {
                        resolve({notice: "Успешная регистрация!"});
                    });
            })
        }
    }


    //PUSH MESSAGE
    this.pushMessage = function(correspondencesId, userName, message) {
        connectBD.query(`INSERT INTO correspondences(correspondences_id, user_name, message) VALUES ("${correspondencesId}", "${userName}", "${message}")`, null);
    }


    //GET CORRESPONDENCE
    this.getCorrespondence = async function (correspondenceID) {
        return await new Promise((resolve => {
            connectBD.query(`SELECT users.id, users.user_name, correspondences.message 
                                      FROM tentacles.correspondences JOIN users ON correspondences.user_name = users.id 
                                      WHERE correspondences.correspondences_id = "${correspondenceID}"`,
                (err, values) => resolve(values));
        }));
    }


    //GET AVATAR
    this.getAvatar = async function (avatar) {

        return await new Promise(resolve => {
            fs.readFile(`../user_files/avatars/${avatar}.jpg`, (err, image) => {

                if(err) {
                    fs.readFile("../user_files/avatars/Logo.png", (err, image) => {
                        resolve({image, default: true});
                    });
                }else {
                    resolve({image,  default: false});
                }
            });
        });
    }


    //CHANGE AVATAR
    this.changeAvatar = async function ({avatar, label}) {
        console.log(label);
        const stream = fs.createWriteStream(`../user_files/avatars/${label}.jpg`);
        return await new Promise(resolve => {

            stream.on("finish", () => {
                resolve("done");
            })

            stream.write(Buffer.from(avatar));
            stream.end();
        })
    }


    //CHANGE NAME/PASSWORD
    this.changeNamePassword = async function ({user_name, password, id, oldName}) {
        const isUnique = await new Promise(resolve => {
            user_name === oldName ? resolve(true) :
            connectBD.query(`SELECT user_name FROM users WHERE user_name="${user_name}"`, (err, value) => {
                value.length > 0 ? resolve(false) : resolve(true);
            })
        })

        if(!isUnique) return {notice: "Такой пользователь уже есть!"}
        return await  new Promise(resolve => {
           connectBD.query(`UPDATE users SET user_name="${user_name}", password="${password}" WHERE id="${id}"`, () => {
               resolve({user_name, password, id});
           })
        });
    }


    //CREATE POST
    this.createPost = async function ({author, text, image}) {

        connectBD.query(`INSERT INTO news(author, text) VALUES ("${author}", "${text}")`);

        const postID = await new Promise(resolve => {
            connectBD.query(`SELECT id FROM news ORDER BY id DESC LIMIT 1`, (err, values) => {
                resolve(values[0].id);
            });
        });

        if(image) {
            connectBD.query(`UPDATE news SET image="${postID}" WHERE id="${postID}"`);

            const stream = fs.createWriteStream(`../user_files/postImage/${postID}.jpg`);
            return await new Promise(resolve => {

                stream.on("finish", () => {
                    resolve("done");
                })

                stream.write(Buffer.from(image));
                stream.end();

            });
        }
    }


    //GET NEWS
    this.getNews = async function () {
        return await new Promise(resolve => {
            connectBD.query("SELECT news.author, news.id, news.text, news.image, users.user_name, users.id AS userID  FROM news JOIN users ON users.id = news.author ORDER BY news.id DESC", async (err, value) => {
                for (let post in value) {

                    //get all post image
                    await new Promise(resolve => {
                        fs.readFile(`../user_files/postImage/${value[post].image}.jpg`, (err, image) => {
                            if(err) resolve();

                            value[post].image = image;
                            resolve();
                        });
                    });

                    //get all avatars of authors
                    await new Promise(async resolve => {
                        value[post].author = (await this.getAvatar(value[post].userID)).image;
                        resolve();
                    });
                }

                resolve(value);
            });
        });
    }


    //ADD FAVOURITES
    this.changeFavourites = function({favourites, id}) {
        connectBD.query(`UPDATE users SET favourites = "${favourites}" WHERE id = "${id}"`);
    }
}




module.exports = function () {
    return new MainDB();
}








