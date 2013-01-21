var Ward = require('../models/ward.js'),
	Task = require('../models/task.js'),
	User = require('../models/user.js'),
	Patient = require('../models/patient.js'),
	async = require('async'),
	_ = require('underscore');

exports.admin = new Object();

exports.admin.index = function(req, res){
	Ward.find({}, 'name description beds', function(err, wards){
		if (err) {
			res.send(500, err.message);
			return;
		}

		res.render('wards/admin/index', {wards: wards});
	});
};

exports.admin.add = function(req, res){
	res.render('wards/admin/add');
};

exports.admin.add.post = function(req, res){
	new Ward({name: req.body.ward_name, description: req.body.ward_description}).save(function(err){
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		res.json({status: 0});
	});
};

exports.admin.view = function(req, res){
	Ward.findById(req.params.id, function(err, ward){
		if (err) {
			res.send(500, err.message);
			return;
		}

		if (!ward) {
			res.send(404);
			return;
		}

		res.render('wards/admin/view', {ward: ward});
	});
};

exports.admin.delete = function(req, res){
	Ward.findById(req.params.id, function(err, ward){
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!ward) {
			res.json({status: 2, message: "Ward not found."});
			return;
		}

		ward.remove();
		res.json({status: 0});
	});

};

exports.index = function(req, res){
	Ward.find({}, 'name description beds patients', function(err, wards) {
		if (err) {
			res.send(500, err.message);
			return;
		}

		if (!wards) {
			res.send(500, 'No wards.');
			return;
		}

		var calls = [];
		var ward_tasks = {};

		wards.forEach(function(ward) {
			ward_tasks[ward.id] = 0;

			ward.patients.forEach(function(patient) {
				calls.push(function(callback) {

					Patient.findById(patient, 'tasks')
						.populate('tasks', 'status')
						.exec(function(err, p) {
							if (err) {
								callback(err);
								return;
							}

							p.tasks.forEach(function(task) {
								if (task.status < 3) {
									ward_tasks[ward.id]++;
								}
							});

							callback();
						});
				});
			});
		});

		async.parallel(calls, function(err, result) {
			if (err) {
				res.send(500, err.message);
				return;
			}

			res.render('wards/index', {wards: wards, ward_tasks: ward_tasks});
		});
	});
};

exports.view = function(req, res) {
	Ward.findById(req.params.id, 'name patients')
		.populate('patients', 'first_name middle_name last_name age gender bed tasks')
		.exec(function(err, ward) {
			if (err) {
				res.send(500, err.message);
				return;
			}

			if (!ward) {
				res.send(404);
				return;
			}

			var calls = [];
			var patient_tasks = [];
			var patient_users = [];

			// TODO: rewrite this when mongoose supports nested .populate on queries
			// https://github.com/LearnBoost/mongoose/issues/601
			ward.patients.forEach(function(patient) {
				calls.push(function(callback) {
					Task.find({'_id': {$in: patient.tasks}, 'status': {$lt: 3}}, '_id', function(err, tasks) {
						if (err) {
							callback(err);
							return;
						}

						patient_tasks[patient.id] = tasks.length;

						User.findOne({patients: patient.id}, 'full_name type', function(err, user) {
							if (err) {
								callback(err);
								return;
							}

							if (user) {
								patient_users[patient.id] = {id: user.id, name: user.name_with_type};
							} else {
								patient_users[patient.id] = false;
							}

							callback();
						});
					});
				});
			});

			async.parallel(calls, function(err, result) {
				if (err) {
					res.send(500, err.message);
					return;
				}

				var patients = [];

				ward.patients.forEach(function(patient) {
					if (patient_users[patient.id] && patient_users[patient.id].id == req.session.user.id) {
						patients.push(patient);
					}
				});

				ward.patients.forEach(function(patient) {
					if (patient_users[patient.id] && patient_users[patient.id].id != req.session.user.id) {
						patients.push(patient);
					}
				});

				ward.patients.forEach(function(patient) {
					if (!patient_users[patient.id]) {
						patients.push(patient);
					}
				});

				res.render('wards/view', {ward: ward, patients: patients, tasks: patient_tasks, patient_users: patient_users});
			});
		});
};
