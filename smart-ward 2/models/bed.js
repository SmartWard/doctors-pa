var mongoose = require('mongoose');

var BedSchema = new mongoose.Schema({
	name: {type: String, required: true}
});

module.exports = mongoose.model('Bed', BedSchema);
