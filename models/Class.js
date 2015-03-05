var mongoose = require('mongoose');

var ClassSchema = new mongoose.Schema({
	className: String,
	allPosts: [{
		title: String,
		upvotes: {type: Number, default: 0}	
	}],
	gotchaCount: {type: Number, default: 0},
	fuzzyCount: {type: Number, default: 0}
});

var ClassRoom = mongoose.model('ClassRoom', ClassSchema);
module.exports = ClassRoom;