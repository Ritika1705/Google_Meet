const express = require("express");
const path = require("path");

var app = express();
let port = process.env.PORT || 8000;
var server = app.listen(port,function(){
    //console.log("Listening on port 3000");
});
const fs = require('fs');
const io = require("socket.io")(server);
const fileUpload = require("express-fileupload");
app.use(express.static(path.join(__dirname,"")));

var userConnections = [];

io.on("connection", (socket) => {
    console.log("Socket io id is ",socket.id);
    socket.on("userconnect",(data)=> {
        console.log("userconnect", data.displayName, data.meeting_id);

        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meeting_id
        );

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meeting_id
        });
        
        console.log(other_users.length);

        var userCount = userConnections.length;

        other_users.forEach((v) => {
            socket.to(v.connectionId).emit("inform_others_about_me", {
                other_user_id: data.displayName,
                connId: socket.id,
                userNumber: userCount
            })


        socket.emit("inform_me_about_other_users",other_users);


        });


        socket.on("SDPProcess",(data)=> {
            socket.to(data.to_connid).emit("SDPProcess",{
                message: data.message,
                from_connid: socket.id,
                 
            })
        });

        socket.on("sendMessage", (msg) => {
            console.log(msg);
            var mUser =  userConnections.find((p) => p.connectionId == socket.id);
            if(mUser){
                var meetingid = mUser.meeting_id;
                var from =  mUser.user_id;
                var list = userConnections.filter((p)=>p.meeting_id == meetingid);
                list.forEach((v) => {
                    socket.to(v.connectionId).emit("showChatMessage",{
                        from: from,
                        message:msg
                    })
                })
            }
        });

        socket.on("fileTransferToOther", (msg) => {
            console.log(msg);
            var mUser =  userConnections.find((p) => p.connectionId == socket.id);
            if(mUser){
                var meetingid = mUser.meeting_id;
                var from =  mUser.user_id;
                var list = userConnections.filter((p)=>p.meeting_id == meetingid);
                list.forEach((v) => {
                    socket.to(v.connectionId).emit("showFileMessage",{
                        username: msg.username,
                        meetingid: msg.meetingid,
                        filePath: msg.filePath,
                        fileName: msg.fileName 
                    })
                })
            }
        });

        socket.on("disconnect", function(){
            console.log("Disconnected");
            var disUser = userConnections.find((p) => p.connectionId == socket.id);
            if(disUser){
                var meetingid = disUser.meeting_id;
                userConnections = userConnections.filter((p) => p.connectionId != socket.id);
                var list = userConnections.filter((p) => p.meeting_id == meetingid);
                list.forEach((v) => {
                    var usernumafterdisconnection = userConnections.length;
                    socket.to(v.connectionId).emit("inform_others_about_disconnected_user", {
                        connId: socket.id,
                        uNumber: usernumafterdisconnection
                    });
                });
            }
        });

         
    });
});
app.use(fileUpload());
app.post("/attachimg", function(req,res){
    var data = req.body;
    var imageFile = req.files.zipfile;
    console.log(imageFile);
    var dir = "public/attachment/" + data.meeting_id + "/";
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    imageFile.mv(
        "public/attachment/" + data.meeting_id + "/" + imageFile.name,
        function(error){
            if(error){
                console.log("Couldn't upload the image file, error: ", error);
            }else{
                console.log("Image file uploaded successfully");
            }
        }
    )
});