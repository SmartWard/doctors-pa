var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	Bed = require('./bed.js'),
	Patient = require('./patient.js');

var WardSchema = new Schema({
	name: {type: String, required: true},
	description: {type: String, required: true},
	beds: [Bed.schema],
	patients: [{type: Schema.Types.ObjectId, ref: 'Patient', index: {unique: true}}]
});

module.exports = mongoose.model('Ward', WardSchema);
