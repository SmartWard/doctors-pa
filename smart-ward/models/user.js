var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Patient = require('./patient.js'),
	Task = require('./task.js');

var UserSchema = new Schema({
    username: {type: String, required: true, index: {unique: true}},
    full_name: {type: String, required: true},
    hash: {type: String, required: true},
    salt: {type: String, required: true},
    specialty: {type: String},
    phone: {type: String},
    bleep: {type: String},
    is_admin: {type: Boolean, required: true},
	type: {type: String, enum: ['doctor', 'nurse']},
	patients: [{type: Schema.Types.ObjectId, ref: 'Patient', index: {unique: true}}],
	tasks: [{type: Schema.Types.ObjectId, ref: 'Task', index: {unique: true}}]
});

UserSchema.virtual('name_with_type').get(function(){
	return this.type == 'doctor' ? 'Dr. ' + this.full_name : this.full_name;
});

module.exports = mongoose.model('User', UserSchema);
