var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');
var router = express.Router();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//Conect to local host server
server.listen(1337, function(){
    console.log("Server magic happens on port 1337");
})

var gotchaData = [];

//DB set up stuff
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/classRooms');
var ClassRoom = require('./models/Class');

//Serve home page on App load
app.get('/', function(req, res) {
  res.render('index', {});
});

app.post('/classes', function(req, res){
	var newClass = new ClassRoom();
	newClass.className = req.body.name;

	ClassRoom.find({className: req.body.name}, function(err, found){
		if(!found.length)
		{
			newClass.save(function(err){
				if(err)
					console.log(err);
				console.log("Class " + req.body.name + " created!");
				ClassRoom.find({className: req.body.name}, function(err, found2){
	 				res.json(found2[0]);
				});
			});
		}
		else
			res.json(found[0]);
	});
});

app.post('/classes/posts', function(req, res){
	ClassRoom.findByIdAndUpdate(req.body.id, 
		{$push: {"allPosts": req.body.post}},
		{},
		function(err, data){
			res.json(data.allPosts);
		});
});

app.get('/classes/:name', function(req, res){
	console.log(req.params.name);
	ClassRoom.find({className: req.params.name}, function(err, found){
		if(err)
			console.log("NOT FOUND");
		console.log(found);
		res.json(found);
	});
});

//SOCKET STUFF
io.sockets.on('connection', function(socket){

	socket.on('joinRoom', function(room){
		socket.join(room);
	});

	socket.on('leaveRoom', function(room){
		socket.leave(room);
		var socketArray = getAllRoomMembers(room, '/');
		var numSockets = socketArray.length;
		if(!numSockets){
			ClassRoom.findOneAndRemove({className: room}, function(err, found){
				console.log("Class: " + room + " removed");
			});
		}
	});

	socket.on('postQuestion', function(data){
		console.log("Post: " + data.message + " in room " + data.room);
		io.sockets.in(data.room).emit('postQuestion', {
	        message: data.message
	    });
	});

	socket.on('upvotePost', function(data){
		ClassRoom.findOneAndUpdate({className: data.room, "allPosts.title": data.post.title},
		   {$inc: {"allPosts.$.upvotes": 1}},
		   function(err, callBackData){
		   		io.sockets.in(data.room).emit('upvotePost', {post: data.post});
		   });
	});

	socket.on('incrementGotcha', function(data){
		ClassRoom.findOneAndUpdate({className: data.room},
			{$inc: {gotchaCount: 1}},
			function(err, found){
				io.sockets.in(data.room).emit('incrementGotcha', {});	
			});
	});

	socket.on('incrementFuzzy', function(data){
		ClassRoom.findOneAndUpdate({className: data.room},
			{$inc: {fuzzyCount: 1}},
			function(err, found){
				io.sockets.in(data.room).emit('incrementFuzzy', {});	
			});
	});

});

//FUNCTION THAT RETURNS HOW MANY SOCKETS ARE CONNECTED TO A ROOM
function getAllRoomMembers(room, _nsp) {
    var roomMembers = [];
    var nsp = (typeof _nsp !== 'string') ? '/' : _nsp;
    for( var member in io.nsps[nsp].adapter.rooms[room] ) {
        roomMembers.push(member);
    }
    return roomMembers;
}


module.exports = app;
