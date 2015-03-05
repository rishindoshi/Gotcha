var app = angular.module("flapperNews", ['ngRoute', 'ngAnimate', 'googlechart']);

//ROUTE CONFIGURATION
app.config(['$routeProvider', function ($routeProvider){
	$routeProvider.when('/questions', {
		templateUrl: 'views/question.html',
		controller: 'question'
	});

	$routeProvider.when('/gotcha', {
		templateUrl: 'views/gotcha.html',
		controller: 'counts'
	});

	$routeProvider.when('/', {
		templateUrl: 'views/home.html',
		controller: 'main'
	});

	$routeProvider.otherwise({
		redirectTo: '/'
	});
}]);


app.controller("question", ['$scope', 'posts', 'getClass', 'classDB', 'classCounts', 'socket',
				function ($scope, posts, getClass, classDB, classCounts, socket){
	$scope.posts = posts;
	$scope.getClass = getClass;
	$scope.classDB = classDB;
	$scope.classCounts = classCounts;
	$scope.socket = socket;
	$scope.whichView = "question";

	$scope.addPost = function(){
		if(!$scope.title || $scope.title === '') {return;}

		$scope.classDB.createPost({name: $scope.getClass.room, 
								   post: {title: $scope.title, upvotes: 0},
								   id: $scope.getClass.id})
			.success(function(data){
				$scope.posts.array = data;
			})
			.error(function(data){
				console.log("Posting error");
			});

		var tempTitle = $scope.title;
		$scope.title = '';
		socket.emit('postQuestion', {message: tempTitle, room: $scope.getClass.room});
	};

	$scope.incrementPost = function(post){
		socket.emit("upvotePost", {
			room: $scope.getClass.room,
			post: post,
			allPosts: $scope.posts.array
		});
	};

	$scope.addGotcha = function(){
		socket.emit("incrementGotcha", {room: $scope.getClass.room});
	};

	$scope.addFuzzy = function(){
		socket.emit("incrementFuzzy", {room: $scope.getClass.room});
	};

	$scope.chartObject = {};

    $scope.onions = [
        {v: "Onions"},
        {v: 3},
    ];

    $scope.gotchaChart = [
    	{v: "Gotcha!"},
    	{v: $scope.classCounts.gotchaCount}
    ];

    $scope.fuzzyChart = [
    	{v: "Still Fuzzy..."},
    	{v: $scope.classCounts.fuzzyCount}
    ];

    $scope.chartObject.data = 
    	{"cols": [
	        {id: "t", label: "Topping", type: "string"},
	        {id: "s", label: "Slices", type: "number"}
        ],
	    "rows": [
	        {c: $scope.gotchaChart},
	        {c: $scope.fuzzyChart}
	    ]};
    $scope.chartObject.type = "PieChart";
    $scope.chartObject.options = {
        'title': '',
        is3D: true,
        width: 650,
        height: 650,
        colors: ['#2c3e50', '#f15f5d'],
        fontName: 'Helvetica',
        chartArea: {left: '13%', top: '10%'},
        legend: {position: 'none'}
    }
    
	//SOCKET STUFF

	socket.on('postQuestion', function(data){
		$scope.posts.array.push({title: data.message, upvotes: 0});
	});

	socket.on("upvotePost", function(data){
		for(var i=0; i<$scope.posts.array.length; i++)
		{
			if($scope.posts.array[i].title == data.post.title)
				$scope.posts.array[i].upvotes ++;
		}
	});

	socket.on("incrementGotcha", function(data){
		$scope.classCounts.gotchaCount ++;
		$scope.chartObject.data.rows[0].c[1].v++;
	});

	socket.on("incrementFuzzy", function(data){
		$scope.classCounts.fuzzyCount ++;
		$scope.chartObject.data.rows[1].c[1].v++;
	});

	//NOT SURE IF THIS SHOULD BE HERE BUT WHATEVS
	window.onbeforeunload = function (event) {
	  socket.emit("leaveRoom", $scope.getClass.room);
	}

}]);

//POSTS CONTROLLER
app.controller("main", ['$scope', 'posts', 'socket', 'getClass', 'classCounts', 'classDB',
			   function ($scope, posts, socket, getClass, classCounts, classDB){
	$scope.posts = posts;
	$scope.getClass = getClass;
	$scope.socket = socket;
	$scope.classCounts = classCounts;
	$scope.classDB = classDB;
	$scope.whichView = "main";
	
	$scope.setClassName = function(){
		$scope.classDB.createClass({name: $scope.className})
			.success(function(data){
				$scope.getClass.id = data._id;
				$scope.getClass.room = data.className;
				$scope.posts.array = data.allPosts;
				$scope.classCounts.gotchaCount = data.gotchaCount;
				$scope.classCounts.fuzzyCount = data.fuzzyCount;
				socket.emit('joinRoom', $scope.getClass.room);
			})
			.error(function(data){
				console.log("ERROR COULD NOT GET DATA");
			});
	};
}]);

app.factory('classDB', function($http){
	return {
		getClass: function(className){
			return $http.get('/classes/'+className);	
		},

		createClass: function(className){
			return $http.post('/classes', className)
		},

		createPost: function(post){
			return $http.post('/classes/posts', post);
		},
	};
});

//POST FACTORY
app.factory('posts', [function(){
	var o = {};
	return o;
}]);

//CLASSNAME FACTORY
app.factory('getClass', function(){
	var o = {};
	return o;
});

//COUNT DATA FACTORY
app.factory('classCounts', function(){
	var o = {
		gotchaCount: 0,
		fuzzyCount: 0
	};
	return o;
});

//SOCKET FACTORY
app.factory('socket', function($rootScope) {
    var socket = io.connect(window.location.hostname + ':1337');
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
});






