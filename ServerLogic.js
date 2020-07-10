
function MainServerLogic() {

    this.interlocutorsStatus = new Map();  //структура new Map(correspondenceID, [[true, false]])
    this.onlineList = new Map();  //структра new Map(юзер, id сокета)


    //SET FLAG TO FALSE OR TRUE
    this.setStatus = function (status, correspondenceID) {
        if(this.interlocutorsStatus.has(correspondenceID)){
            if (this.interlocutorsStatus.get(correspondenceID).includes(status)) {
                this.interlocutorsStatus.set(correspondenceID, [status, status]);
            } else {
                this.interlocutorsStatus.set(correspondenceID, [status, !status]);
            }

            //SET interlocutorsStatus FOR CURRENT CORRESPONDENCE_ID IF NOT EXIST
        }else {
            this.interlocutorsStatus.set(correspondenceID, [status, !status]);
        }
    }

    //IF USER DISCONNECT
    this.disconnect = function (socket) {
        for(let elem of this.onlineList) {
            if(socket.id === elem[1]) {
                console.log(elem[0] + " отключился");
                this.onlineList.delete(elem[0]);
            }
        }
        console.log("В сети: ");
        for (let elem of this.onlineList) {
            console.log(elem);
        }
    }

}



module.exports = function () {
    return new MainServerLogic();
}
