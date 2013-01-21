var User = require('../models/user.js'),
	pwd = require('pwd'),
	_ = require('underscore');

exports.io = null;
exports.admin = new Object();

function authenticate(name, pass, fn) {
	User.findOne({username: name}, function(err, user) {
		if (err) return fn(err);

		if (!user) return fn(new Error('User does not exist.'));

		pwd.hash(pass, user.salt, function(err, hash){
			if (err) return fn(err);
			if (hash == user.hash) return fn(null, user);
			fn(new Error('Incorrect password.'));
		});
	});
}

exports.restrict_user = function restrict(req, res, next) {
	if (req.session.user && !req.session.user.is_admin) {
		res.locals.user_only = true;
		next();
	} else {
		req.session.message = 'Access denied!';
		res.redirect('/users/login');
	}
};

exports.restrict_admin = function restrict(req, res, next) {
	if (req.session.user && req.session.user.is_admin) {
		next();
	} else {
		req.session.message = 'Access denied!';
		res.redirect('/users/login');
	}
};

exports.index = function(req, res) {
	res.render('users/index');
};

exports.login = function(req, res) {
	res.render('users/login');
};

exports.login.post = function(req, res) {
	authenticate(req.body.login_username, req.body.login_password, function(err, user) {
		if (user)
		{
			req.session.regenerate(function() {
				req.session.user = user.toJSON({virtuals: true});

				if (user.is_admin) {
					res.redirect('/admin');
				} else {
					res.redirect('/');
				}
			});
		} else {
			req.session.message = "Authentication failed, please check your username and password.";
			res.redirect('/users/login');
		}
	});
};

exports.logout = function(req, res) {
	var socket = exports.io.sockets.sockets[req.session.socket_id];

	if (socket) {
		socket.disconnect();
	}

	req.session.destroy(function() {
		res.redirect('/');
	});
};

exports.admin.index = function(req, res) {
	User.find({}, 'username full_name specialty', function(err, users){
		res.render('users/admin/index', {users: users});
	});
};

exports.admin.add = function(req, res) {
	res.render('users/admin/add');
};

exports.admin.view = function(req, res) {
	User.findById(req.params.id, function(err, user){
		if (err) throw err;

		if (!user) {
			res.send(404);
			return;
		}

		res.render('users/admin/view', {user: user});
	});
}

exports.admin.add.post = function(req, res) {
	if (!req.body.admin_user_add_password || !req.body.admin_user_add_password.length) {
		res.json({status: 1, message: 'Please enter a password'});
		return;
	}

	if (!req.body.admin_user_add_password_repeat || !req.body.admin_user_add_password_repeat.length) {
		res.json({status: 2, message: 'Please enter a password'});
		return;
	}

	if (req.body.admin_user_add_password != req.body.admin_user_add_password_repeat) {
		res.json({status: 3, message: 'Your passwords do not match'});
		return;
	}

	var u = {
		username: req.body.admin_user_add_name,
		full_name: req.body.admin_user_add_full_name,
		specialty: req.body.admin_user_add_specialty,
		phone: req.body.admin_user_add_phone,
		bleep: req.body.admin_user_add_bleep,
		is_admin: req.body.admin_user_add_isadmin == 'yes' ? true : false,
		type: req.body.admin_user_add_type
	};

	User.count({username: req.body.admin_user_add_name}, function(err, count){
		if (err) throw err;

		if (count) {
			res.json({status: 4, message: 'This username is already in use'});
			return;
		}

		pwd.hash(req.body.admin_user_add_password, function(err, salt, hash) {
			if(err) throw err;

			u.hash = hash;
			u.salt = salt;

			new User(u).save(function(err){
				if (err) {
					delete err.message;
					res.json(_.extend(err, {status: 5}));
					return;
				}

				res.json({status: 0});
			});
		});
	});
};
