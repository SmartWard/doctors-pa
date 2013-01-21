var Task = require('../models/task.js'),
	User = require('../models/user.js'),
	Patient = require('../models/patient.js'),
	Ward = require('../models/ward.js'),
	async = require('async');

exports.io = null;
exports.edit = new Object();

exports.add = function(req, res) {
	User.find({}, 'full_name type', function(err, users) {
		if (err) throw err;

		res.render('tasks/add', {users: users, patient: req.params.id});
	});
};

exports.add.post = function(req, res) {
	if (!req.body.task_add_date || !req.body.task_add_time_hour || !req.body.task_add_time_minute) {
		res.json({status: 1, message: 'Missing parameters.'});
		return;
	}

	var hour = parseInt(req.body.task_add_time_hour);
	var minute = parseInt(req.body.task_add_time_minute);

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		res.json({status: 2, message: 'Incorrect parameters.'});
		return;
	}

	User.findById(req.body.task_add_assign_to, function(err, user) {
		if (err || !user) {
			res.send(404);
			return;
		}

		Patient.findById(req.body.task_add_patient_id, function(err, patient) {
			if (err || !patient) {
				res.send(404);
				return;
			}

			var date = new Date(req.body.task_add_date);
			date.setHours(hour, minute);

			var t = new Task({
				name: req.body.task_add_name,
				description: req.body.task_add_description,
				time: date,
				created_by: req.session.user.name_with_type,
				priority: req.body.task_add_priority,
				status: 1
			});

			t.comments.push({
				message: 'Task created by ' + req.session.user.name_with_type + '.'
			});

			t.comments.push({
				message: 'Task assigned to ' + user.name_with_type + '.'
			});

			t.save(function(err, task) {
				if (err) {
					var message = '';

					for (e in err.errors){
						message += err.errors[e].message + "<br>";
					}

					res.json({status: 3, message: message});
					return;
				}

				user.tasks.push(task.id);
				user.save(function(err){
					if (err) throw err;

					patient.tasks.push(task.id);
					patient.save(function(err){
						if (err) throw err;

						if (user.id != req.session.user.id) {
							var socket;
							for (var s in exports.io.sockets.sockets) {
								if (exports.io.sockets.sockets[s].session.user.id == user.id) {
									socket = exports.io.sockets.sockets[s];
									break;
								}
							}

							if (socket) {
								socket.emit('task_assigned', {task_id: task.id});
							}
						}

						res.send({status: 0});
					});
				});
			});
		});
	});
};

exports.view = function(req, res) {
	Task.findById(req.params.id, function(err, task) {
		if (err) {
			res.send(500, err.message);
			return;
		};

		if (!task)
		{
			res.send(404, 'Task not found.');
			return;
		}

		Patient.findOne({tasks: req.params.id}, 'first_name middle_name last_name age bed gender', function(err, patient) {
			if (err) {
				res.send(500, err.message);
				return;
			};

			User.findOne({tasks: req.params.id}, 'full_name type', function(err, user) {
				if (err) {
					res.send(500, err.message);
					return;
				};

				User.find({}, 'full_name type', function(err, users) {
					if (err) {
						res.send(500, err.message);
						return;
					};

					Ward.findOne({patients: patient.id}, 'name', function(err, ward) {
						if (err) {
							res.send(500, err.message);
							return;
						};

						res.render('tasks/view', {
							task: task,
							patient: patient,
							user: user,
							ward: ward,
							users: users
						});
					});
				});
			});
		});
	});
};

exports.comment = function(req, res) {
	Task.findById(req.params.id, function(err, task) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		};

		if (!task)
		{
			res.json({status: 2, message: 'Can not find task.'});
			return;
		}

		if (!req.body.task_view_comment) {
			res.json({status: 3, message: 'Please enter a comment.'});
			return;
		}

		task.comments.push({
			message: req.body.task_view_comment,
			user: req.session.user.name_with_type
		});

		task.save(function(err) {
			if (err) {
				res.json({status: 4, message: err.message});
				return;
			};

			res.json({status: 0});
		});
	});
};

exports.edit.priority = function(req, res) {
	Task.findById(req.params.id, function(err, task) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		};

		if (!task) {
			res.json({status: 2, message: 'Task not found.'});
			return;
		}

		task.priority = req.body.priority;
		task.save(function(err) {
			if (err) {
				res.json({status: 3, message: err.message});
				return;
			}

			task.comments.push({
				user: req.session.user.name_with_type,
				message: 'Task priority set to \'' + task.priority_name + '\'.'
			});

			task.save(function(err) {
				if (err) {
					res.json({status: 4, message: err.message});
					return;
				};

				res.json({status: 0});
			});
		});
	});
};

exports.edit.status = function(req, res) {
	Task.findById(req.params.id, function(err, task) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		};

		if (!task) {
			res.json({status: 2, message: 'Task not found.'});
			return;
		}

		task.status = req.body.status;
		task.save(function(err) {
			if (err) {
				res.json({status: 3, message: err.message});
				return;
			}

			if (task.status == 3)
			{
				User.findOne({tasks: task.id}, function(err, user) {
					if (err) {
						res.json({status: 4, message: err.message});
						return;
					};

					if (user) {
						user.tasks.remove(task.id);
						user.save(function(err) {
							if (err) {
								res.json({status: 5, message: err.message});
								return;
							};
						});
					}
				});
			}

			task.comments.push({
				user: req.session.user.name_with_type,
				message: 'Task staus set to \'' + task.status_name + '\'.'
			});

			task.save(function(err) {
				if (err) {
					res.json({status: 6, message: err.message});
					return;
				};

				res.json({status: 0});
			});
		});
	});
};

exports.edit.assign = function(req, res) {
	Task.findById(req.params.id, function(err, task) {
		if (err) {
			res.json({status: 1, message: err.message});
			return;
		}

		if (!task) {
			res.json({status: 2, message: 'Task not found.'});
			return;
		}

		User.findOne({tasks: task.id}, function(err, user_from) {
			user_from.tasks.remove(task.id);
			user_from.save(function(err) {
				if (err) {
					res.json({status: 3, message: err.message});
					return;
				};
			});
		});

		User.findById(req.body.user_id, function(err, user_to) {
			if (err) {
				res.json({status: 4, message: err.message});
				return;
			};

			if (!user_to) {
				res.json({status: 5, message: 'User not found.'});
				return;
			}

			user_to.tasks.push(task.id);
			user_to.save(function(err) {
				if (err) {
					res.json({status: 6, message: err.message});
					return;
				};

				task.comments.push({
					user: req.session.user.name_with_type,
					message: 'Task assigned to to ' + user_to.name_with_type + '.'
				});

				task.save(function(err) {
					if (err) {
						res.json({status: 7, message: err.message});
						return;
					};

					if (user_to.id != req.session.user.id) {
						var socket;
						for (var s in exports.io.sockets.sockets) {
							if (exports.io.sockets.sockets[s].session.user.id == user_to.id) {
								socket = exports.io.sockets.sockets[s];
								break;
							}
						}

						if (socket) {
							socket.emit('task_assigned', {task_id: task.id});
						}
					}

					res.json({status: 0});
				});
			});
		});
	});
};

exports.my = function(req, res) {
	User.findById(req.session.user.id, 'tasks')
		.populate('tasks', 'name priority')
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
			var task_patients = {};

			user.tasks.forEach(function(task) {
				calls.push(function(callback) {
					Patient.findOne({tasks: task.id}, 'first_name middle_name last_name', function(err, patient) {
						if (err) {
							callback(err);
							return;
						}

						task_patients[task.id] = patient.full_name;
						callback();
					});
				});
			});

			async.parallel(calls, function(err) {
				if (err) {
					res.send(500, err.message);
					return;
				}

				res.render('tasks/my', {tasks: user.tasks, patients: task_patients});
			});
		});
};
