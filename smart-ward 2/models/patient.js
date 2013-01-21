var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var PatientSchema = new Schema({
	first_name: {type: String, required: true},
	middle_name: {type: String, required: true},
	last_name: {type: String, required: true},
	age: {type: Number, required: true},
	gender: {type: String, enum: ['male', 'female']},
	bed: {type: String},
	created: {type: Date, default: Date.now},
	tasks: [{type: Schema.Types.ObjectId, ref: 'Task', index: {unique: true}}],
	medical_history: [{
		message: {type: String, required: true},
		created: {type: Date, default: Date.now},
		user: {type: String}
	}]
});

PatientSchema.virtual('full_name').get(function(){
	return this.first_name + " " + this.middle_name + " " + this.last_name;
});

module.exports = mongoose.model('Patient', PatientSchema);
