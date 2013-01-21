var Patient = require('../models/patient.js'),
	Ward = require('../models/ward.js'),
	User = require('../models/user.js'),
	Task = require('../models/task.js'),
	async = require('async');

exports.add = function(req, res) {
	Ward.find({}, 'name', function(err, wards) {
		if (err) throw err;

		res.render('patients/add', {wards: wards});
	});
};

exports.add.post = function(req, res) {
	var p = {
		first_name: req.body.patient_add_first_name,
		middle_name: req.body.patient_add_middle_name,
		last_name: req.body.patient_add_last_name,
		age: req.body.patient_add_age,
		gender: req.body.patient_add_gender
	};

	Ward.findById(req.body.patient_add_ward, function(err, ward) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!ward) {
			res.json({status: 2, message: 'Ward does not exist.'});
			return;
		}

		var patient = new Patient(p);

		patient.medical_history.push({
			message: 'Patient added to database.',
			user: req.session.user.name_with_type
		});

		patient.medical_history.push({
			message: 'Assign patient to ward \'' + ward.name + '\'.',
			user: req.session.user.name_with_type
		});

		patient.save(function(err, patient){
			if (err) {
				var message = '';

				for (e in err.errors){
					message += err.errors[e].message + "<br>";
				}

				res.json({status: 3, message: message});
				return;
			}

			User.findById(req.session.user.id, function(err, user) {
				if (err) {
					res.json({status: 4, message: err.message});
					return;
				}

				if (!user) {
					res.json({status: 5, message: 'User not found.'});
					return;
				}

				user.patients.push(patient.id);
				user.save(function(err) {
					if (err) {
						res.json({status: 6, message: err.message});
						return;
					}

					ward.patients.push(patient.id);
					ward.save(function(err) {
						if (err) {
							res.json({status: 7, message: err.message});
							return;
						}

						res.json({status: 0});
					});
				});
			});
		});
	});
};

exports.view = function(req, res) {
	Patient.findById(req.params.id, 'first_name middle_name last_name age gender bed created tasks')
	.populate('tasks', 'name priority time', {status: {$lt: 3}})
	.exec(function(err, patient) {
		if (err) {
			if (err) {
				res.send(500, err.message);
				return;
			}
		}

		if (!patient) {
			res.send(404, 'Patient not found.');
			return;
		}

		var calls = {};

		/* Find the users the tasks are assigned to. */
		calls.patient_tasks = function(callback) {
			patient.tasks.forEach(function(task, ind) {
				User.findOne({tasks: task.id}, 'full_name type', function(err, user) {
					if (err) {
						callback(err);
						return;
					}

					if (user) {
						task.user = user.name_with_type;
					}
				});
			});

			callback();
		};

		/* Find the ward the user is assigned to. */
		calls.ward = function(callback) {
			Ward.findOne({patients: patient.id}, '_id name beds', function(err, ward) {
				if (err) {
					callback(err);
					return;
				}

				callback(null, ward);
			});
		};

		/* Get the list of wards. */
		calls.list_of_wards = function(callback) {
			Ward.find({}, 'name', function(err, list_of_wards) {
				if (err) {
					callback(err);
					return;
				}

				callback(null, list_of_wards);
			});
		};

		/* Find the doctor the patient is assigned to. */
		calls.user = function(callback) {
			User.findOne({patients: patient.id}, 'full_name type', function(err, user) {
				if (err) {
					callback(err);
					return;
				}

				callback(null, user);
			});
		};

		/* Get the list of doctors. */
		calls.list_of_doctors = function(callback) {
			User.find({type: 'doctor'}, 'full_name type', function(err, list_of_doctors) {
				if (err) {
					callback(err);
					return;
				}

				callback(null, list_of_doctors);
			});
		}

		async.parallel(calls, function(err, results) {
			if (err) {
				res.send(500, err.message);
				return;
			}

			var params = {
				patient: patient,
				user: results.user ? results.user : null,
				ward: results.ward ? results.ward : null,
				list_of_wards: results.list_of_wards,
				list_of_doctors: results.list_of_doctors
			};

			res.render('patients/view', params);
		});
	});
};

exports.view.history = function(req, res) {
	Patient
		.findById(req.params.id,'first_name middle_name last_name age gender tasks medical_history')
		.populate('tasks', 'name priority time', {status: 3})
		.exec(function(err, patient) {
			if (err) {
				res.send(500, err.message);
				return;
			}

			if (!patient) {
				res.send(404, 'Patient not found.');
				return;
			}

			Ward.findOne({patients: patient.id}, 'name', function(err, ward) {
				if (err) {
					callback(err);
					return;
				}

				res.render('patients/history', {patient: patient, ward: ward});
			});
	});
};

exports.edit = new Object();

exports.edit.ward = function(req, res) {
	Patient.findById(req.params.id, function(err, patient) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!patient) {
			res.json({status: 2, message: 'Patient not found.'});
			return;
		}

		var calls = [];

		/* If the patient is in a ward remove it. */
		calls.push(function(callback) {
			Ward.findOne({patients: patient.id}, function(err, ward) {
				if (err) {
					callback(err);
					return;
				}

				if (ward) {
					ward.patients.remove(patient.id);
					ward.save(function(err) {
						if (err) {
							callback(err);
							return;
						}

						callback();
					});
				} else {
					callback();
				}
			});
		});

		/* Add the patient to the new ward. */
		calls.push(function(callback) {
			if (!req.body.ward_id || !req.body.ward_id.trim()) {
				patient.medical_history.push({
					message: 'Patient removed from ward.',
					user: req.session.user.name_with_type
				});

				patient.save();
				callback()
				return;
			}

			Ward.findById(req.body.ward_id, function(err, ward) {
				if (err) {
					callback(err);
					return;
				}

				if (!ward) {
					callback(new Error('Ward not found.'));
					return;
				}

				patient.medical_history.push({
					message: 'Assign patient to ward \'' + ward.name + '\'.',
					user: req.session.user.name_with_type
				});

				patient.save();

				ward.patients.push(patient.id);
				ward.save(function(err) {
					if (err) {
						callback(err);
						return;
					}

					callback();
				});
			});
		});

		async.parallel(calls, function(err) {
			if (err) {
				res.json({status: 3, message: err.message});
				return;
			}

			patient.bed = '';
			patient.save();

			res.json({status: 0});
		});
	});
};

exports.edit.user = function(req, res) {
	Patient.findById(req.params.id, function(err, patient) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!patient) {
			res.json({status: 2, message: 'Patient not found'});
			return;
		}

		var calls = [];

		/* If the patient is assigned to a user remove it. */
		calls.push(function(callback) {
			User.findOne({patients: patient.id}, function(err, user) {
				if (err) {
					callback(err);
					return;
				}

				if (user) {
					user.patients.remove(patient.id);
					user.save(function(err) {
						if (err) {
							callback(err);
							return;
						}

						callback();
					});
				} else {
					callback();
				}
			});
		});

		/* Assign the patient to the other user. */
		calls.push(function(callback) {
			if (!req.body.user_id || !req.body.user_id.trim()) {

				patient.medical_history.push({
					message: 'Patient is no longer assigned to user.',
					user: req.session.user.name_with_type
				});

				patient.save();
				callback()
				return;
			}

			User.findById(req.body.user_id, function(err, user) {
				if (err) {
					callback(err);
					return;
				}

				if (!user) {
					callback(new Error('User not found.'));
					return;
				}

				patient.medical_history.push({
					message: 'Assign patient to ' + user.name_with_type + '.',
					user: req.session.user.name_with_type
				});

				patient.save();

				user.patients.push(patient.id);
				user.save(function(err) {
					if (err) {
						callback(err);
						return;
					}

					callback();
				});
			});
		});

		async.parallel(calls, function(err) {
			if (err) {
				res.json({status: 3, message: err.message});
				return;
			}

			res.json({status: 0});
		});
	});
};

exports.edit.bed = function(req, res) {
	Patient.findById(req.params.id, function(err, patient) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!patient) {
			res.json({status: 2, message: 'Patient not found.'});
			return;
		}

		patient.bed = req.body.bed_name.trim();

		patient.medical_history.push({
			message:
				patient.bed ? 'Assign patient to bed \'' + patient.bed + '\'.' : 'Remove patient from bed.',
			user: req.session.user.name_with_type
		});

		patient.save(function(err) {
			if (err) {
				res.json({status: 3, message: err.message});
				return;
			}

			res.json({status: 0});
		});
	});
};

exports.my = function(req, res) {
	User.findById(req.session.user.id, 'patients')
		.populate('patients', 'first_name middle_name last_name age bed gender tasks')
		.exec(function(err, user) {
			if (err) {
				res.send(500, err.message);
				return;
			}

			if (!user) {
				res.send(404, 'User not found');
				return;
			}

			var calls = [];
			var patient_tasks = {};
			var patient_wards = {};

			// TODO: rewrite this when mongoose supports nested .populate on queries
			// https://github.com/LearnBoost/mongoose/issues/601
			user.patients.forEach(function(patient) {
				calls.push(function(callback) {
					Task.find({'_id': {$in: patient.tasks}, 'status': {$lt: 3}}, '_id', function(err, tasks) {
						if (err) {
							callback(err);
							return;
						}

						patient_tasks[patient.id] = tasks.length;

						Ward.findOne({patients: patient.id}, 'name', function(err, ward) {
							if (err) {
								callback(err);
								return;
							}

							patient_wards[patient.id] = ward.name;

							callback();
						});
					});
				});
			});

			async.parallel(calls, function(err, result) {
				res.render('patients/my', {patients: user.patients, tasks: patient_tasks, wards: patient_wards});
			});
		});
};
