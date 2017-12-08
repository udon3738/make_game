const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

var p = 0;
var i = 0;
var count = 5*5;
var timerid;
io.on('connection', function(socket){
    socket.userid = i++;
    console.log("connected");
    if(i==2){
	console.log("let's start!!");
	timerid = setInterval(function(){
	    if(count > 0){
		count--;
		io.emit('are-you-ready',count);
	    }else{
		io.emit('informtiming');
		console.log("request....");
	    }
	}, 150);
    }
    socket.emit('userinfo',
		{
		    user:socket.userid
		});
    socket.on('informcount',function(data){
	console.log(data);console.log(socket.userid);
	socket.broadcast.emit('count',data);
    });
    socket.on('hog',function(data){
	console.log(data);console.log(socket.userid);
	socket.broadcast.emit('count',{
	    user:socket.userid,
	    data:data.count
	});
    });
    socket.on('disconnect',function(){
	io.emit("AFK");
	console.log("disconnected");
	count = 5*7;
	i--;
	clearInterval(timerid);
    });
    console.log("hogeend");
});

<<<<<<< HEAD
http.listen(port, 'localhost', () => console.log('listening on port ' + port));
=======
http.listen(port, '172.22.3.134', () => console.log('listening on port ' + port));
>>>>>>> 502ba29d1f64920cfe957fd526f5c149cc078b13
