var Bed = require('../models/bed.js'),
	Ward = require('../models/ward.js');

exports.admin = new Object();
exports.admin.add = new Object();

exports.admin.add.post = function(req, res) {
	Ward.findById(req.body.bed_add_ward_id, function(err, doc){
		if (err) throw err;

		if (!doc)
		{
			res.json({status: 1, message: 'ward not found'});
			return;
		}

		doc.beds.push(new Bed({name: req.body.bed_add_name}).toObject());
		doc.save(function(err){
			if (err) {
				console.log(req.body.bed_add_name);
				res.json({status: 2, message: err.message});
				return;
			}

			res.json({status: 0});
		});
	});
}

exports.admin.delete = function(req, res){
	Ward.findById(req.params.ward, function(err, ward){
		if (err) throw err;

		if (!ward) {
			res.json({status: 1, message: "Ward not found."});
			return;
		}

		var bed = ward.beds.id(req.params.bed);

		if (!bed)
		{
			res.json({status: 2, message: "Bed not found."});
			return;
		}

		bed.remove(function(){
			ward.save(function(){
				res.json({status: 0});
			});
		});
	});
}
