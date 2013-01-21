var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var TaskSchema = new Schema({
	name: {type: String, required: true},
	description: {type: String, required: true},
	created: {type: Date, default: Date.now},
	time: {type: Date, required: true},
	created_by: {type: String, required: true},
	priority: {type: Number, min: 1, max: 3},
	status: {type: Number, min: 1, max: 3},
	comments: [{
		message: {type: String, required: true},
		created: {type: Date, default: Date.now},
		user: {type: String}
	}]
});

TaskSchema.virtual('priority_name').get(function(){
	var priority_levels = {
		1: 'Low',
		2: 'Medium',
		3: 'High'
	};

	return priority_levels[this.priority];
});

TaskSchema.virtual('status_name').get(function(){
	var status_names = {
		1: 'New',
		2: 'Work In Progress',
		3: 'Completed'
	};

	return status_names[this.status];
});

module.exports = mongoose.model('Task', TaskSchema);
