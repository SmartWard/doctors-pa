var User = require('../models/user.js'),
	Session = require('express/node_modules/connect').middleware.session.Session;

var user_status_list = {};

exports.sessionKey = exports.cookieParser = exports.sessionStore = null;

exports.load_users = function() {
	User.find({}, 'full_name type', function(err, users) {
		if (err) throw err;

		var new_user_status_list = {};

		users.forEach(function(user) {
			new_user_status_list[user.id] = user.toJSON({virtuals: true});

			if (user_status_list[user.id]) {
				new_user_status_list[user.id].online = user_status_list[user.id].online;
			} else {
				new_user_status_list[user.id].online = false;
			}

			user_status_list = new_user_status_list;
		});
	});
};

exports.authorization = function(data, accept) {
	exports.cookieParser(data, {}, function(err) {
		if (err) {
			accept(err, false);
		} else {
			var session_id = data.signedCookies[exports.sessionKey];
			exports.sessionStore.get(session_id, function(err, session) {
				if (err || !session) {
					accept('Session error.', false);
				} else {
					if (!session.user) {
						accept('User not logged in.', false);
						return;
					}

					data.sessionID = session_id;
					data.sessionStore = exports.sessionStore;
					data.session = new Session(data, session);

					accept(null, true);
				}
			});
		}
	});
};

exports.connection = function(socket) {
	socket.session = socket.handshake.session;
	socket.session.socket_id = socket.id;
	socket.session.save();

	user_status_list[socket.session.user.id].online = true;
	socket.broadcast.emit('users_list_changed', {user_status_list: user_status_list});

	socket.on('get_users_list', function() {
		socket.emit('users_list_changed', {user_status_list: user_status_list});
	});

	socket.on('disconnect', function() {
		user_status_list[socket.session.user.id].online = false;
		socket.broadcast.emit('users_list_changed', {user_status_list: user_status_list});
	});
};
