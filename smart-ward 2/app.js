
/* Module dependencies. */
var express = require('express')
  , connect = require('express/node_modules/connect')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , io = require('socket.io')
  , ws = require('./routes/socket.io');

/* Application routes. */
var routes = require('./routes')
  , beds = require('./routes/beds')
  , users = require('./routes/users')
  , wards = require('./routes/wards')
  , patients = require('./routes/patients')
  , tasks = require('./routes/tasks');

var secret = 'smartwardsecret!';
var sessionKey = 'express.sid';
var cookieParser = express.cookieParser(secret);
var sessionStore = new connect.middleware.session.MemoryStore();

ws.sessionKey = sessionKey;
ws.cookieParser = cookieParser;
ws.sessionStore = sessionStore;

var app = express()
  , server = http.createServer(app);

mongoose.connect('mongodb://localhost/smartward');

mongoose.connection.on('open', function() {
	ws.load_users();
	console.log("Connected to MongoDB server at " + this.host);
});

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(cookieParser);
	app.use(express.session({store: sessionStore, key: sessionKey}));
	app.use(express.static(path.join(__dirname, 'public')));

	app.use(function(req, res, next){
		res.locals.user_only = false;

		if (req.session.message)
		{
			res.locals.message = req.session.message;
			delete req.session.message;
		}

		next();
	});

	app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

/* Admin panel routes. */

app.get('/admin', users.restrict_admin, routes.admin.index);

app.get('/admin/users', users.restrict_admin, users.admin.index);
app.get('/admin/users/add', users.restrict_admin, users.admin.add);
app.post('/admin/users/add', users.restrict_admin, users.admin.add.post);
app.get('/admin/users/view/:id', users.restrict_admin, users.admin.view);

app.post('/admin/beds/add', users.restrict_admin, beds.admin.add.post);
app.get('/admin/beds/delete/:ward/:bed', users.restrict_admin, beds.admin.delete);

app.get('/admin/wards', users.restrict_admin, wards.admin.index);
app.get('/admin/wards/add', users.restrict_admin, wards.admin.add);
app.post('/admin/wards/add', users.restrict_admin, wards.admin.add.post);
app.get('/admin/wards/view/:id', users.restrict_admin, wards.admin.view);
app.get('/admin/wards/delete/:id', users.restrict_admin, wards.admin.delete);


/* Front end routes. */

app.get('/', users.restrict_user, wards.index);

app.get('/users/login', users.login);
app.post('/users/login', users.login.post);
app.get('/users/logout', users.logout);
app.get('/users', users.restrict_user, users.index);

app.get('/patients/add', users.restrict_user, patients.add);
app.post('/patients/add', users.restrict_user, patients.add.post);
app.get('/patients/view/:id', users.restrict_user, patients.view);
app.get('/patients/view/:id/history', users.restrict_user, patients.view.history);
app.post('/patients/edit/:id/ward', users.restrict_user, patients.edit.ward);
app.post('/patients/edit/:id/user', users.restrict_user, patients.edit.user);
app.post('/patients/edit/:id/bed', users.restrict_user, patients.edit.bed);
app.get('/patients/my', users.restrict_user, patients.my);

app.get('/wards/view/:id', users.restrict_user, wards.view);

app.get('/tasks/add/:id', users.restrict_user, tasks.add);
app.post('/tasks/add', users.restrict_user, tasks.add.post);
app.get('/tasks/view/:id', users.restrict_user, tasks.view);
app.post('/tasks/comment/:id', users.restrict_user, tasks.comment);
app.post('/tasks/edit/:id/priority', users.restrict_user, tasks.edit.priority);
app.post('/tasks/edit/:id/status', users.restrict_user, tasks.edit.status);
app.post('/tasks/edit/:id/assign', users.restrict_user, tasks.edit.assign);
app.get('/tasks/my', users.restrict_user, tasks.my);

io = io.listen(server);

io.configure(function () {
	io.set('transports', ['websocket', 'xhr-polling']);
});

users.io = tasks.io = io;

io.set('authorization', ws.authorization);
io.sockets.on('connection', ws.connection);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
